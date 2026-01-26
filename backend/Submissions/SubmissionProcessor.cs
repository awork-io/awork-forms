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

    public async Task<SubmissionProcessResult> ProcessSubmissionAsync(int submissionId)
    {
        var result = new SubmissionProcessResult { SubmissionId = submissionId };

        try
        {
            await using var db = await _dbFactory.CreateDbContextAsync();

            var submission = await db.Submissions
                .Include(s => s.Form)
                .ThenInclude(f => f.User)
                .FirstOrDefaultAsync(s => s.Id == submissionId);

            if (submission == null)
            {
                result.Status = "failed";
                result.ErrorMessage = "Submission not found";
                return result;
            }

            var form = submission.Form;
            var userId = form.UserId;

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

            string? createdProjectId = null;
            string? createdTaskId = null;

            if (form.ActionType == "project" || form.ActionType == "both")
            {
                var projectRequest = BuildProjectRequest(formData, formFields, fieldMappings.ProjectFieldMappings, form.AworkProjectTypeId);
                var project = await _aworkService.CreateProjectAsync(userId, projectRequest);
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

                if (!string.IsNullOrEmpty(targetProjectId))
                {
                    // Extract custom field mappings and link them to project first
                    var customFieldMappings = GetCustomFieldMappings(fieldMappings.TaskFieldMappings);
                    foreach (var cfMapping in customFieldMappings)
                    {
                        var cfId = cfMapping.AworkField.StartsWith("custom:") 
                            ? cfMapping.AworkField.Substring(7) 
                            : cfMapping.AworkField;
                        await _aworkService.LinkCustomFieldToProject(userId, targetProjectId, cfId);
                    }

                    var taskRequest = BuildTaskRequest(formData, formFields, fieldMappings.TaskFieldMappings,
                        targetProjectId, form.AworkTaskStatusId, form.AworkTypeOfWorkId, form.AworkTaskListId,
                        form.AworkAssigneeId, form.AworkTaskIsPriority ?? false);

                    var task = await _aworkService.CreateTaskAsync(userId, targetProjectId, taskRequest);
                    if (task != null)
                    {
                        createdTaskId = task.Id;
                        result.AworkTaskId = task.Id;

                        // Set custom field values
                        var customFieldValues = BuildCustomFieldValues(formData, formFields, customFieldMappings);
                        if (customFieldValues.Count > 0)
                        {
                            await _aworkService.SetTaskCustomFields(userId, task.Id, customFieldValues);
                        }

                        // Handle tags
                        var tags = GetTagsFromMappings(formData, formFields, fieldMappings.TaskFieldMappings);
                        if (tags.Count > 0)
                        {
                            await _aworkService.AddTagsToTask(userId, task.Id, tags);
                        }

                        await AttachFilesToTaskAsync(userId, task.Id, formData, formFields);
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

    private async Task AttachFilesToTaskAsync(int userId, string taskId, Dictionary<string, object?> formData, List<FormFieldInfo> formFields)
    {
        var fileFields = formFields.Where(f => f.Type == "file").ToList();
        if (fileFields.Count == 0) return;

        var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "submissions");

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
                            var localPath = GetLocalFilePath(fileData.FileUrl, uploadsPath);
                            if (File.Exists(localPath))
                                await _aworkService.AttachFileToTaskAsync(userId, taskId, localPath, fileData.FileName);
                        }
                    }
                    else if (jsonElement.ValueKind == JsonValueKind.Array)
                    {
                        var files = JsonSerializer.Deserialize<List<FileUploadData>>(jsonElement.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (files != null)
                        {
                            foreach (var fileData in files.Where(f => !string.IsNullOrEmpty(f.FileUrl)))
                            {
                                var localPath = GetLocalFilePath(fileData.FileUrl, uploadsPath);
                                if (File.Exists(localPath))
                                    await _aworkService.AttachFileToTaskAsync(userId, taskId, localPath, fileData.FileName);
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

    private static string GetLocalFilePath(string fileUrl, string uploadsPath)
    {
        // fileUrl is like "/uploads/submissions/filename.ext"
        var fileName = Path.GetFileName(fileUrl);
        return Path.Combine(uploadsPath, fileName);
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

    private static AworkCreateProjectRequest BuildProjectRequest(Dictionary<string, object?> formData, List<FormFieldInfo> formFields, List<FieldMapping> mappings, string? projectTypeId)
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
        string projectId, string? taskStatusId, string? typeOfWorkId, string? taskListId, string? assigneeId, bool isPriority)
    {
        var request = new AworkCreateTaskRequest
        {
            ProjectId = projectId,
            EntityId = projectId,
            TaskStatusId = taskStatusId,
            TypeOfWorkId = typeOfWorkId,
            IsPriority = isPriority
        };

        if (!string.IsNullOrEmpty(taskListId))
            request.Lists = [new AworkTaskListAssignment { Id = taskListId }];

        if (!string.IsNullOrEmpty(assigneeId))
            request.Assignments = [new AworkTaskAssignment { UserId = assigneeId }];

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

    private static string GetCustomFieldId(string aworkField)
    {
        return aworkField.StartsWith("custom:") ? aworkField.Substring(7) : aworkField;
    }

    private static List<CustomFieldValue> BuildCustomFieldValues(Dictionary<string, object?> formData, List<FormFieldInfo> formFields, List<FieldMapping> customFieldMappings)
    {
        var result = new List<CustomFieldValue>();

        foreach (var mapping in customFieldMappings)
        {
            var value = GetMappedValue(formData, formFields, mapping.FormFieldId);
            if (string.IsNullOrEmpty(value)) continue;

            result.Add(new CustomFieldValue
            {
                CustomFieldDefinitionId = GetCustomFieldId(mapping.AworkField),
                TextValue = value
            });
        }

        return result;
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
