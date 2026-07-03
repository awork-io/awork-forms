using System.Net;
using System.Text.Json;
using Backend.Awork;
using Backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Backend.Submissions;

public class SubmissionProcessor
{
    private readonly IDbContextFactory<AppDbContext> _dbFactory;
    private readonly AworkApiService _aworkService;
    private readonly ILogger<SubmissionProcessor> _logger;

    public SubmissionProcessor(
        IDbContextFactory<AppDbContext> dbFactory,
        AworkApiService aworkService,
        ILogger<SubmissionProcessor> logger)
    {
        _dbFactory = dbFactory;
        _aworkService = aworkService;
        _logger = logger;
    }

    public async Task<SubmissionProcessResult> ProcessSubmission(int submissionId)
    {
        var result = new SubmissionProcessResult { SubmissionId = submissionId };

        try
        {
            await using var db = await _dbFactory.CreateDbContextAsync();

            var submission = await db.Submissions
                .Include(s => s.Form)
                .FirstOrDefaultAsync(s => s.Id == submissionId);

            if (submission == null)
            {
                result.Status = "failed";
                result.ErrorMessage = "Submission not found";
                return result;
            }

            var form = submission.Form;
            var userId = await GetSubmissionUserId(db, form);
            if (userId == null)
            {
                submission.Status = "failed";
                submission.ErrorMessage = "No authenticated user available for the form owner";
                submission.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
                result.Status = "failed";
                result.ErrorMessage = submission.ErrorMessage;
                return result;
            }

            if (string.IsNullOrEmpty(form.ActionType))
            {
                submission.Status = "completed";
                await db.SaveChangesAsync();
                result.Status = "completed";
                return result;
            }

            var formData = ParseFormData(submission.DataJson);
            var fieldMappings = ParseFieldMappings(form.FieldMappingsJson);
            var formFields = ParseFormFields(form.FieldsJson);

            Guid? createdProjectId = null;
            Guid? createdTaskId = null;

            if (form.ActionType == "project" || form.ActionType == "both")
            {
                var projectRequest = BuildProjectRequest(formData, formFields, fieldMappings.ProjectFieldMappings, form.AworkProjectTypeId);
                var project = await _aworkService.CreateProject(userId.Value, projectRequest);
                if (project != null)
                {
                    createdProjectId = project.Id;
                    result.AworkProjectId = project.Id;
                }
            }

            if (form.ActionType == "task" || form.ActionType == "both")
            {
                var targetProjectId = form.ActionType == "both" && createdProjectId != null
                    ? createdProjectId
                    : form.AworkProjectId;

                if (targetProjectId != null)
                {
                    // Extract custom field mappings and link them to project first
                    var customFieldMappings = GetCustomFieldMappings(fieldMappings.TaskFieldMappings);
                    foreach (var cfMapping in customFieldMappings)
                    {
                        var cfId = GetCustomFieldId(cfMapping.AworkField);
                        if (cfId == null) continue;
                        await _aworkService.LinkCustomFieldToProject(userId.Value, targetProjectId.Value, cfId.Value);
                    }

                    var customFieldDefinitions = await _aworkService.GetProjectCustomFields(userId.Value, targetProjectId.Value);
                    var customFieldDefinitionMap = customFieldDefinitions.ToDictionary(c => c.Id, c => c);

                    var resolvedTypeOfWorkId = await ResolveTypeOfWorkIdAsync(
                        userId.Value,
                        formData,
                        formFields,
                        fieldMappings.TaskFieldMappings,
                        form.AworkTypeOfWorkId);

                    var taskRequest = BuildTaskRequest(formData, formFields, fieldMappings.TaskFieldMappings,
                        targetProjectId.Value, form.AworkTaskStatusId, resolvedTypeOfWorkId, form.AworkTaskListId,
                        form.AworkTaskIsPriority ?? false);

                    var task = await _aworkService.CreateTask(userId.Value, targetProjectId.Value, taskRequest);
                    if (task != null)
                    {
                        createdTaskId = task.Id;
                        result.AworkTaskId = task.Id;

                        // Assign user to task (separate API call)
                        if (form.AworkAssigneeId != null)
                        {
                            await _aworkService.AssignUserToTask(userId.Value, task.Id, form.AworkAssigneeId.Value);
                        }

                        // Set custom field values
                        var customFieldValues = BuildCustomFieldValues(formData, formFields, customFieldMappings, customFieldDefinitionMap);
                        if (customFieldValues.Count > 0)
                        {
                            await _aworkService.SetTaskCustomFields(userId.Value, task.Id, customFieldValues);
                        }

                        // Handle tags (from mappings + form-level tag)
                        var tags = GetTagsFromMappings(formData, formFields, fieldMappings.TaskFieldMappings);
                        if (!string.IsNullOrWhiteSpace(form.AworkTaskTag))
                        {
                            tags.Add(form.AworkTaskTag.Trim());
                        }
                        if (tags.Count > 0)
                        {
                            await _aworkService.AddTagsToTask(userId.Value, task.Id, tags.Distinct().ToList());
                        }

                        await AttachFilesToTask(userId.Value, task.Id, formData, formFields);
                    }
                }
            }

            submission.Status = "completed";
            submission.AworkProjectId = createdProjectId;
            submission.AworkTaskId = createdTaskId;
            submission.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            result.Status = "completed";

            // Track submission created event
            _ = _aworkService.TrackEvent(userId.Value, "Forms User Action", new Dictionary<string, object>
            {
                { "action", "submission_created" },
                { "tool", "awork-forms" },
                { "formId", form.Id },
                { "submissionId", submissionId },
                { "actionType", form.ActionType ?? "none" },
                { "createdTask", createdTaskId != null },
                { "createdProject", createdProjectId != null }
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            result.Status = "failed";
            result.ErrorMessage = $"awork authentication error: {ex.Message}";
            await UpdateSubmissionStatus(submissionId, "failed", result.ErrorMessage);
        }
        catch (Exception ex)
        {
            result.Status = "failed";
            result.ErrorMessage = $"Processing error: {ex.Message}";
            await UpdateSubmissionStatus(submissionId, "failed", result.ErrorMessage);
        }

        return result;
    }

    private async Task UpdateSubmissionStatus(int submissionId, string status, string? errorMessage)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var submission = await db.Submissions.FindAsync(submissionId);
        if (submission != null)
        {
            submission.Status = status;
            submission.ErrorMessage = errorMessage;
            submission.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
    }

    private async Task AttachFilesToTask(Guid userId, Guid taskId, Dictionary<string, object?> formData, List<FormFieldInfo> formFields)
    {
        var fileFields = formFields.Where(f => f.Type == "file").ToList();
        if (fileFields.Count == 0) return;

        await using var db = await _dbFactory.CreateDbContextAsync();

        foreach (var field in fileFields)
        {
            if (!formData.TryGetValue(field.Id, out var value) || value == null) continue;

            try
            {
                if (value is JsonElement jsonElement)
                {
                    if (jsonElement.ValueKind == JsonValueKind.Object)
                    {
                        var fileData = JsonSerializer.Deserialize<FileUploadData>(jsonElement.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (fileData != null && !string.IsNullOrEmpty(fileData.FileUrl))
                        {
                            var fileBytes = await GetFileFromDatabase(db, fileData.FileUrl);
                            if (fileBytes != null)
                                await _aworkService.AttachFileToTask(userId, taskId, fileBytes, fileData.FileName);
                        }
                    }
                    else if (jsonElement.ValueKind == JsonValueKind.Array)
                    {
                        var files = JsonSerializer.Deserialize<List<FileUploadData>>(jsonElement.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (files != null)
                        {
                            foreach (var fileData in files.Where(f => !string.IsNullOrEmpty(f.FileUrl)))
                            {
                                var fileBytes = await GetFileFromDatabase(db, fileData.FileUrl);
                                if (fileBytes != null)
                                    await _aworkService.AttachFileToTask(userId, taskId, fileBytes, fileData.FileName);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error attaching file from field {FieldId}", field.Id);
            }
        }
    }

    private static async Task<byte[]?> GetFileFromDatabase(AppDbContext db, string fileUrl)
    {
        // fileUrl is like "/api/files/{guid}"
        var fileName = Path.GetFileName(fileUrl);
        if (!Guid.TryParse(fileName, out var fileId))
            return null;

        var file = await db.FileUploads.FirstOrDefaultAsync(f => f.PublicId == fileId);
        return file?.Data;
    }

    private static Dictionary<string, object?> ParseFormData(string dataJson)
    {
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, object?>>(dataJson) ?? new();
        }
        catch { return new(); }
    }

    private static FieldMappingsData ParseFieldMappings(string? mappingsJson)
    {
        if (string.IsNullOrEmpty(mappingsJson)) return new();
        try
        {
            return JsonSerializer.Deserialize<FieldMappingsData>(mappingsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
        }
        catch { return new(); }
    }

    private static List<FormFieldInfo> ParseFormFields(string fieldsJson)
    {
        try
        {
            return JsonSerializer.Deserialize<List<FormFieldInfo>>(fieldsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
        }
        catch { return new(); }
    }

    private static AworkCreateProjectRequest BuildProjectRequest(Dictionary<string, object?> formData, List<FormFieldInfo> formFields, List<FieldMapping> mappings, Guid? projectTypeId)
    {
        var request = new AworkCreateProjectRequest { ProjectTypeId = projectTypeId };
        var descriptionMappings = mappings
            .Where(m => string.Equals(m.AworkField, "description", StringComparison.OrdinalIgnoreCase))
            .ToList();
        var hasMultipleDescriptionMappings = descriptionMappings.Count > 1;

        foreach (var mapping in mappings)
        {
            var rawValue = GetMappedValue(formData, formFields, mapping.FormFieldId);
            if (string.IsNullOrEmpty(rawValue)) continue;
            var displayValue = GetMappedValue(formData, formFields, mapping.FormFieldId, mapSelectToLabel: true);

            switch (mapping.AworkField)
            {
                case "name":
                    request.Name = displayValue ?? rawValue;
                    break;
                case "description":
                    if (!hasMultipleDescriptionMappings)
                        request.Description = displayValue ?? rawValue;
                    break;
                case "startDate":
                    if (TryParseDate(rawValue, out var startDate))
                        request.StartDate = startDate;
                    break;
                case "dueDate":
                    if (TryParseDate(rawValue, out var dueDate))
                        request.DueDate = dueDate;
                    break;
            }
        }

        if (hasMultipleDescriptionMappings)
            request.Description = BuildFormattedDescription(formData, formFields, descriptionMappings);

        if (string.IsNullOrEmpty(request.Name))
            request.Name = $"Form Submission {DateTime.UtcNow:yyyy-MM-dd HH:mm}";

        return request;
    }

    private static AworkCreateTaskRequest BuildTaskRequest(Dictionary<string, object?> formData, List<FormFieldInfo> formFields, List<FieldMapping> mappings,
        Guid projectId, Guid? taskStatusId, Guid? typeOfWorkId, Guid? taskListId, bool isPriority)
    {
        var request = new AworkCreateTaskRequest
        {
            EntityId = projectId,
            TaskStatusId = taskStatusId,
            TypeOfWorkId = typeOfWorkId,
            IsPriority = isPriority
        };

        if (taskListId != null)
            request.Lists = [new AworkTaskListAssignment { Id = taskListId.Value }];

        var descriptionMappings = mappings
            .Where(m => string.Equals(m.AworkField, "description", StringComparison.OrdinalIgnoreCase))
            .ToList();
        var hasMultipleDescriptionMappings = descriptionMappings.Count > 1;

        foreach (var mapping in mappings)
        {
            var rawValue = GetMappedValue(formData, formFields, mapping.FormFieldId);
            if (string.IsNullOrEmpty(rawValue)) continue;
            var displayValue = GetMappedValue(formData, formFields, mapping.FormFieldId, mapSelectToLabel: true);

            switch (mapping.AworkField)
            {
                case "name":
                    request.Name = displayValue ?? rawValue;
                    break;
                case "description":
                    if (!hasMultipleDescriptionMappings)
                        request.Description = displayValue ?? rawValue;
                    break;
                case "dueOn":
                    if (TryParseDate(rawValue, out var dueOn))
                        request.DueOn = dueOn;
                    break;
                case "startOn":
                    if (TryParseDate(rawValue, out var startOn))
                        request.StartOn = startOn;
                    break;
                case "plannedDuration":
                    if (double.TryParse(rawValue, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var hours))
                        request.PlannedDuration = (int)(hours * 3600);
                    break;
                case "typeOfWork":
                case "tags":
                    // Handled via dedicated processing paths.
                    break;
            }
        }

        if (hasMultipleDescriptionMappings)
            request.Description = BuildFormattedDescription(formData, formFields, descriptionMappings);

        if (string.IsNullOrEmpty(request.Name))
            request.Name = $"Form Submission {DateTime.UtcNow:yyyy-MM-dd HH:mm}";

        return request;
    }

    private static string? BuildFormattedDescription(
        Dictionary<string, object?> formData,
        List<FormFieldInfo> formFields,
        List<FieldMapping> descriptionMappings)
    {
        var sections = new List<string>();

        foreach (var mapping in descriptionMappings)
        {
            var value = GetMappedValue(formData, formFields, mapping.FormFieldId, mapSelectToLabel: true)?.Trim();
            if (string.IsNullOrWhiteSpace(value))
                continue;

            var label = formFields.FirstOrDefault(f => f.Id == mapping.FormFieldId)?.Label?.Trim();
            if (!string.IsNullOrWhiteSpace(label))
                sections.Add($"<p><strong>{WebUtility.HtmlEncode(label)}</strong></p>");

            sections.AddRange(ConvertPlainTextToHtmlParagraphs(value));
        }

        return sections.Count > 0 ? string.Concat(sections) : null;
    }

    private static IEnumerable<string> ConvertPlainTextToHtmlParagraphs(string value)
    {
        var normalizedValue = value
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n');

        foreach (var paragraph in normalizedValue.Split(["\n\n"], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var encodedParagraph = WebUtility.HtmlEncode(paragraph).Replace("\n", "<br />", StringComparison.Ordinal);
            if (!string.IsNullOrWhiteSpace(encodedParagraph))
                yield return $"<p>{encodedParagraph}</p>";
        }
    }

    private static string? GetMappedValue(
        Dictionary<string, object?> formData,
        List<FormFieldInfo> formFields,
        string fieldId,
        bool mapSelectToLabel = false)
    {
        if (!formData.TryGetValue(fieldId, out var value) || value == null) return null;

        string? mappedValue;
        List<string>? mappedValues = null;
        if (value is JsonElement jsonElement)
        {
            mappedValue = jsonElement.ValueKind switch
            {
                JsonValueKind.String => jsonElement.GetString(),
                JsonValueKind.Number => jsonElement.GetRawText(),
                JsonValueKind.True => "Yes",
                JsonValueKind.False => "No",
                JsonValueKind.Array => string.Join(", ", jsonElement.EnumerateArray().Select(GetJsonElementDisplayValue).Where(v => !string.IsNullOrEmpty(v))),
                _ => jsonElement.GetRawText()
            };
            if (jsonElement.ValueKind == JsonValueKind.Array)
            {
                mappedValues = jsonElement.EnumerateArray().Select(GetJsonElementDisplayValue).Where(v => !string.IsNullOrEmpty(v)).ToList();
            }
        }
        else
        {
            mappedValue = value.ToString();
            if (value is IEnumerable<string> values)
            {
                mappedValues = values.Where(v => !string.IsNullOrEmpty(v)).ToList();
                mappedValue = string.Join(", ", mappedValues);
            }
        }

        if (string.IsNullOrEmpty(mappedValue))
            return mappedValue;

        if (!mapSelectToLabel)
            return mappedValue;

        var formField = formFields.FirstOrDefault(f => f.Id == fieldId);
        if ((formField?.Type != "select" && formField?.Type != "multiselect") || formField.Options == null || formField.Options.Count == 0)
            return mappedValue;

        if (formField.Type == "multiselect" && mappedValues != null)
        {
            return string.Join(", ", mappedValues.Select(v => MapOptionValueToLabel(formField.Options, v)));
        }

        // For option fields we map the stable option value back to the primary label.
        return MapOptionValueToLabel(formField.Options, mappedValue);
    }

    private static string GetJsonElementDisplayValue(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString() ?? string.Empty,
            JsonValueKind.Number => element.GetRawText(),
            JsonValueKind.True => "Yes",
            JsonValueKind.False => "No",
            _ => element.GetRawText()
        };
    }

    private static string MapOptionValueToLabel(List<FormFieldOptionInfo> options, string value)
    {
        var matchedOption = options.FirstOrDefault(o => o.Value == value);
        return !string.IsNullOrWhiteSpace(matchedOption?.Label) ? matchedOption.Label : value;
    }

    private static List<FieldMapping> GetCustomFieldMappings(List<FieldMapping> mappings)
    {
        // Custom fields are either raw GUIDs or prefixed with "custom:"
        return mappings.Where(m => 
        {
            var field = m.AworkField;
            if (field.StartsWith("custom:"))
                field = field.Substring(7);
            return Guid.TryParse(field, out _);
        }).ToList();
    }

    private static Guid? GetCustomFieldId(string aworkField)
    {
        var value = aworkField.StartsWith("custom:") ? aworkField.Substring(7) : aworkField;
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private static List<CustomFieldValue> BuildCustomFieldValues(
        Dictionary<string, object?> formData,
        List<FormFieldInfo> formFields,
        List<FieldMapping> customFieldMappings,
        Dictionary<Guid, AworkCustomFieldDefinition> customFieldDefinitions)
    {
        var result = new List<CustomFieldValue>();

        foreach (var mapping in customFieldMappings)
        {
            var customFieldId = GetCustomFieldId(mapping.AworkField);
            if (customFieldId == null) continue;
            if (!customFieldDefinitions.TryGetValue(customFieldId.Value, out var definition))
                continue;

            var rawValue = GetMappedValue(formData, formFields, mapping.FormFieldId);
            if (string.IsNullOrEmpty(rawValue)) continue;

            var displayValue = GetMappedValue(formData, formFields, mapping.FormFieldId, mapSelectToLabel: true);
            var customFieldValue = BuildCustomFieldValue(definition, rawValue, displayValue);
            if (customFieldValue == null) continue;
            customFieldValue.CustomFieldDefinitionId = customFieldId.Value;
            result.Add(customFieldValue);
        }

        return result;
    }

    private static CustomFieldValue? BuildCustomFieldValue(AworkCustomFieldDefinition definition, string rawValue, string? displayValue)
    {
        var type = definition.Type?.Trim().ToLowerInvariant();
        switch (type)
        {
            case "text":
            case "link":
                return new CustomFieldValue { TextValue = displayValue ?? rawValue };
            case "number":
                if (TryParseNumber(rawValue, out var number))
                    return new CustomFieldValue { NumberValue = number };
                return null;
            case "date":
            case "datetime":
                if (TryParseDate(rawValue, out var date))
                    return new CustomFieldValue { DateValue = date };
                return null;
            case "select":
            case "coloredselect":
                if (TryResolveSelectionOptionId(definition, rawValue, out var selectionId))
                    return new CustomFieldValue { SelectionOptionIdValue = selectionId };
                if (!string.IsNullOrWhiteSpace(displayValue) &&
                    !string.Equals(displayValue, rawValue, StringComparison.Ordinal) &&
                    TryResolveSelectionOptionId(definition, displayValue, out selectionId))
                    return new CustomFieldValue { SelectionOptionIdValue = selectionId };
                return null;
            case "boolean":
                if (TryParseBoolean(rawValue, out var booleanValue))
                    return new CustomFieldValue { BooleanValue = booleanValue };
                return null;
            case "user":
                if (Guid.TryParse(rawValue, out var userId))
                    return new CustomFieldValue { UserIdValue = userId };
                return null;
            case "client":
                if (Guid.TryParse(rawValue, out var clientId))
                    return new CustomFieldValue { ClientIdValue = clientId };
                return null;
            default:
                return new CustomFieldValue { TextValue = displayValue ?? rawValue };
        }
    }

    private static bool TryParseNumber(string value, out double number)
    {
        return double.TryParse(value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out number);
    }

    private static bool TryParseDate(string value, out DateTime date)
    {
        return DateTime.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out date);
    }

    private static bool TryParseBoolean(string value, out bool result)
    {
        var normalized = value.Trim().ToLowerInvariant();
        if (normalized is "true" or "yes" or "1" or "on")
        {
            result = true;
            return true;
        }
        if (normalized is "false" or "no" or "0" or "off")
        {
            result = false;
            return true;
        }
        return bool.TryParse(value, out result);
    }

    private static bool TryResolveSelectionOptionId(AworkCustomFieldDefinition definition, string value, out Guid selectionId)
    {
        if (Guid.TryParse(value, out selectionId))
            return true;

        if (definition.SelectionOptions == null)
            return false;

        var match = definition.SelectionOptions.FirstOrDefault(o =>
            string.Equals(o.Value, value, StringComparison.OrdinalIgnoreCase));

        if (match == null) return false;
        selectionId = match.Id;
        return true;
    }

    private static async Task<Guid?> GetSubmissionUserId(AppDbContext db, Data.Entities.Form form)
    {
        if (form.CreatedBy != null)
        {
            return await db.Users
                .Where(u => u.Id == form.CreatedBy &&
                    u.AworkWorkspaceId == form.WorkspaceId &&
                    !string.IsNullOrEmpty(u.AccessToken))
                .Select(u => (Guid?)u.Id)
                .FirstOrDefaultAsync();
        }

        return await db.Users
            .Where(u => u.AworkWorkspaceId == form.WorkspaceId && !string.IsNullOrEmpty(u.AccessToken))
            .OrderByDescending(u => u.UpdatedAt)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<Guid?> ResolveTypeOfWorkIdAsync(
        Guid userId,
        Dictionary<string, object?> formData,
        List<FormFieldInfo> formFields,
        List<FieldMapping> mappings,
        Guid? fallbackTypeOfWorkId)
    {
        var mappedTypeOfWork = mappings.FirstOrDefault(m =>
            string.Equals(m.AworkField, "typeOfWork", StringComparison.OrdinalIgnoreCase));

        if (mappedTypeOfWork == null)
            return fallbackTypeOfWorkId;

        var typeOfWorkName = GetMappedValue(formData, formFields, mappedTypeOfWork.FormFieldId, mapSelectToLabel: true)?.Trim();
        if (string.IsNullOrWhiteSpace(typeOfWorkName))
            return fallbackTypeOfWorkId;

        var existingTypes = await _aworkService.GetTypesOfWork(userId);
        var existingMatch = existingTypes.FirstOrDefault(t =>
            !t.IsArchived &&
            string.Equals(t.Name.Trim(), typeOfWorkName, StringComparison.OrdinalIgnoreCase));

        if (existingMatch != null)
            return existingMatch.Id;

        try
        {
            var createdType = await _aworkService.CreateTypeOfWork(userId, typeOfWorkName);
            if (createdType?.Id != null)
                return createdType.Id;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create type of work '{TypeOfWorkName}'", typeOfWorkName);
        }

        // Handles concurrent creation/race or eventual consistency.
        try
        {
            var refreshedTypes = await _aworkService.GetTypesOfWork(userId);
            var refreshedMatch = refreshedTypes.FirstOrDefault(t =>
                !t.IsArchived &&
                string.Equals(t.Name.Trim(), typeOfWorkName, StringComparison.OrdinalIgnoreCase));
            if (refreshedMatch != null)
                return refreshedMatch.Id;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to refresh type-of-work list after create attempt");
        }

        return fallbackTypeOfWorkId;
    }

    private static List<string> GetTagsFromMappings(Dictionary<string, object?> formData, List<FormFieldInfo> formFields, List<FieldMapping> mappings)
    {
        var tags = new List<string>();

        foreach (var mapping in mappings.Where(m => m.AworkField == "tags"))
        {
            var value = GetMappedValue(formData, formFields, mapping.FormFieldId, mapSelectToLabel: true);
            if (!string.IsNullOrEmpty(value))
            {
                // Split by comma if multiple tags
                tags.AddRange(value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
            }
        }

        return tags.Distinct().ToList();
    }
}

internal class FormFieldInfo
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public List<FormFieldOptionInfo>? Options { get; set; }
}

internal class FormFieldOptionInfo
{
    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

internal class FieldMappingsData
{
    public List<FieldMapping> TaskFieldMappings { get; set; } = [];
    public List<FieldMapping> ProjectFieldMappings { get; set; } = [];
}

internal class FieldMapping
{
    public string FormFieldId { get; set; } = string.Empty;
    public string AworkField { get; set; } = string.Empty;
}

internal class FileUploadData
{
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
}
