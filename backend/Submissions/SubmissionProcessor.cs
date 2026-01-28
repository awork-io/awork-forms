using System.Text.Json;
using Backend.Awork;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Submissions;

public class SubmissionProcessor
{
    private readonly IDbContextFactory<AppDbContext> _dbFactory;
    private readonly AworkApiService _aworkService;

    public SubmissionProcessor(IDbContextFactory<AppDbContext> dbFactory, AworkApiService aworkService)
    {
        _dbFactory = dbFactory;
        _aworkService = aworkService;
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
            var userId = await GetWorkspaceUserId(db, form.WorkspaceId);
            if (userId == null)
            {
                submission.Status = "failed";
                submission.ErrorMessage = "No authenticated user available for this workspace";
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

                    var taskRequest = BuildTaskRequest(formData, formFields, fieldMappings.TaskFieldMappings,
                        targetProjectId.Value, form.AworkTaskStatusId, form.AworkTypeOfWorkId, form.AworkTaskListId,
                        form.AworkAssigneeId, form.AworkTaskIsPriority ?? false);

                    var task = await _aworkService.CreateTask(userId.Value, targetProjectId.Value, taskRequest);
                    if (task != null)
                    {
                        createdTaskId = task.Id;
                        result.AworkTaskId = task.Id;

                        // Set custom field values
                        var customFieldValues = BuildCustomFieldValues(formData, formFields, customFieldMappings, customFieldDefinitionMap);
                        if (customFieldValues.Count > 0)
                        {
                            await _aworkService.SetTaskCustomFields(userId.Value, task.Id, customFieldValues);
                        }

                        // Handle tags
                        var tags = GetTagsFromMappings(formData, formFields, fieldMappings.TaskFieldMappings);
                        if (tags.Count > 0)
                        {
                            await _aworkService.AddTagsToTask(userId.Value, task.Id, tags);
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
                Console.WriteLine($"Error attaching file from field {field.Id}: {ex.Message}");
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

        foreach (var mapping in mappings)
        {
            var value = GetMappedValue(formData, formFields, mapping.FormFieldId);
            if (string.IsNullOrEmpty(value)) continue;

            switch (mapping.AworkField)
            {
                case "name": request.Name = value; break;
                case "description": request.Description = value; break;
            }
        }

        if (string.IsNullOrEmpty(request.Name))
            request.Name = $"Form Submission {DateTime.UtcNow:yyyy-MM-dd HH:mm}";

        return request;
    }

    private static AworkCreateTaskRequest BuildTaskRequest(Dictionary<string, object?> formData, List<FormFieldInfo> formFields, List<FieldMapping> mappings,
        Guid projectId, Guid? taskStatusId, Guid? typeOfWorkId, Guid? taskListId, Guid? assigneeId, bool isPriority)
    {
        var request = new AworkCreateTaskRequest
        {
            ProjectId = projectId,
            EntityId = projectId,
            TaskStatusId = taskStatusId,
            TypeOfWorkId = typeOfWorkId,
            IsPriority = isPriority
        };

        if (taskListId != null)
            request.Lists = [new AworkTaskListAssignment { Id = taskListId.Value }];

        if (assigneeId != null)
            request.Assignments = [new AworkTaskAssignment { UserId = assigneeId.Value }];

        foreach (var mapping in mappings)
        {
            var value = GetMappedValue(formData, formFields, mapping.FormFieldId);
            if (string.IsNullOrEmpty(value)) continue;

            switch (mapping.AworkField)
            {
                case "name": request.Name = value; break;
                case "description": request.Description = value; break;
            }
        }

        if (string.IsNullOrEmpty(request.Name))
            request.Name = $"Form Submission {DateTime.UtcNow:yyyy-MM-dd HH:mm}";

        return request;
    }

    private static string? GetMappedValue(Dictionary<string, object?> formData, List<FormFieldInfo> formFields, string fieldId)
    {
        if (!formData.TryGetValue(fieldId, out var value) || value == null) return null;

        if (value is JsonElement jsonElement)
        {
            return jsonElement.ValueKind switch
            {
                JsonValueKind.String => jsonElement.GetString(),
                JsonValueKind.Number => jsonElement.GetRawText(),
                JsonValueKind.True => "Yes",
                JsonValueKind.False => "No",
                _ => jsonElement.GetRawText()
            };
        }

        return value.ToString();
    }

    private static readonly string[] StandardFields = ["name", "description", "dueDate", "startDate", "plannedDuration", "tags"];

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
            var value = GetMappedValue(formData, formFields, mapping.FormFieldId);
            if (string.IsNullOrEmpty(value)) continue;

            var customFieldId = GetCustomFieldId(mapping.AworkField);
            if (customFieldId == null) continue;
            if (!customFieldDefinitions.TryGetValue(customFieldId.Value, out var definition))
                continue;

            var customFieldValue = BuildCustomFieldValue(definition, value);
            if (customFieldValue == null) continue;
            customFieldValue.CustomFieldDefinitionId = customFieldId.Value;
            result.Add(customFieldValue);
        }

        return result;
    }

    private static CustomFieldValue? BuildCustomFieldValue(AworkCustomFieldDefinition definition, string value)
    {
        var type = definition.Type?.Trim().ToLowerInvariant();
        switch (type)
        {
            case "text":
            case "link":
                return new CustomFieldValue { TextValue = value };
            case "number":
                if (TryParseNumber(value, out var number))
                    return new CustomFieldValue { NumberValue = number };
                return null;
            case "date":
            case "datetime":
                if (TryParseDate(value, out var date))
                    return new CustomFieldValue { DateValue = date };
                return null;
            case "select":
            case "coloredselect":
                if (TryResolveSelectionOptionId(definition, value, out var selectionId))
                    return new CustomFieldValue { SelectionOptionIdValue = selectionId };
                return null;
            case "boolean":
                if (TryParseBoolean(value, out var booleanValue))
                    return new CustomFieldValue { BooleanValue = booleanValue };
                return null;
            case "user":
                if (Guid.TryParse(value, out var userId))
                    return new CustomFieldValue { UserIdValue = userId };
                return null;
            case "client":
                if (Guid.TryParse(value, out var clientId))
                    return new CustomFieldValue { ClientIdValue = clientId };
                return null;
            default:
                return new CustomFieldValue { TextValue = value };
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

    private static async Task<Guid?> GetWorkspaceUserId(AppDbContext db, Guid workspaceId)
    {
        return await db.Users
            .Where(u => u.AworkWorkspaceId == workspaceId && !string.IsNullOrEmpty(u.AccessToken))
            .OrderByDescending(u => u.UpdatedAt)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync();
    }

    private static List<string> GetTagsFromMappings(Dictionary<string, object?> formData, List<FormFieldInfo> formFields, List<FieldMapping> mappings)
    {
        var tags = new List<string>();

        foreach (var mapping in mappings.Where(m => m.AworkField == "tags"))
        {
            var value = GetMappedValue(formData, formFields, mapping.FormFieldId);
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
