using System.Text.Json;
using Backend.Awork;
using Backend.Database;

namespace Backend.Submissions;

public class SubmissionProcessor
{
    private readonly DbContextFactory _dbFactory;
    private readonly AworkApiService _aworkService;

    public SubmissionProcessor(DbContextFactory dbFactory, AworkApiService aworkService)
    {
        _dbFactory = dbFactory;
        _aworkService = aworkService;
    }

    /// <summary>
    /// Processes a submission based on form configuration (creates tasks/projects in awork)
    /// </summary>
    public async Task<SubmissionProcessResult> ProcessSubmissionAsync(int submissionId)
    {
        var result = new SubmissionProcessResult { SubmissionId = submissionId };

        try
        {
            // Get submission with form configuration
            var submissionData = GetSubmissionWithFormConfig(submissionId);
            if (submissionData == null)
            {
                result.Status = "failed";
                result.ErrorMessage = "Submission not found";
                return result;
            }

            // Get the form owner's user ID to make awork API calls
            var userId = submissionData.FormUserId;
            var actionType = submissionData.ActionType;

            // If no action type configured, mark as completed immediately
            if (string.IsNullOrEmpty(actionType))
            {
                result.Status = "completed";
                UpdateSubmissionStatus(submissionId, "completed", null, null, null);
                return result;
            }

            // Parse submission data and field mappings
            var formData = ParseFormData(submissionData.DataJson);
            var fieldMappings = ParseFieldMappings(submissionData.FieldMappingsJson);
            var formFields = ParseFormFields(submissionData.FieldsJson);

            string? createdProjectId = null;
            string? createdTaskId = null;

            // Create project if configured
            if (actionType == "project" || actionType == "both")
            {
                var projectRequest = BuildProjectRequest(
                    formData,
                    formFields,
                    fieldMappings.ProjectFieldMappings,
                    submissionData.AworkProjectTypeId
                );

                var project = await _aworkService.CreateProjectAsync(userId, projectRequest);
                if (project != null)
                {
                    createdProjectId = project.Id;
                    result.AworkProjectId = project.Id;
                    Console.WriteLine($"Created awork project: {project.Id} - {project.Name}");
                }
            }

            // Create task if configured
            if (actionType == "task" || actionType == "both")
            {
                // Use the form's configured project, or the newly created project if "both"
                var targetProjectId = submissionData.AworkProjectId;

                // If action type is "both" and we just created a project, create task in that project
                if (actionType == "both" && createdProjectId != null)
                {
                    targetProjectId = createdProjectId;
                }

                if (!string.IsNullOrEmpty(targetProjectId))
                {
                    var taskRequest = BuildTaskRequest(
                        formData,
                        formFields,
                        fieldMappings.TaskFieldMappings,
                        submissionData.AworkTaskStatusId,
                        submissionData.AworkTypeOfWorkId,
                        submissionData.AworkTaskListId,
                        submissionData.AworkAssigneeId,
                        submissionData.AworkTaskIsPriority ?? false
                    );

                    var task = await _aworkService.CreateTaskAsync(userId, targetProjectId, taskRequest);
                    if (task != null)
                    {
                        createdTaskId = task.Id;
                        result.AworkTaskId = task.Id;
                        Console.WriteLine($"Created awork task: {task.Id} - {task.Name}");
                    }
                }
                else
                {
                    Console.WriteLine("Warning: Task creation configured but no project ID specified");
                }
            }

            result.Status = "completed";
            UpdateSubmissionStatus(submissionId, "completed", createdProjectId, createdTaskId, null);
        }
        catch (UnauthorizedAccessException ex)
        {
            result.Status = "failed";
            result.ErrorMessage = $"awork authentication error: {ex.Message}";
            UpdateSubmissionStatus(submissionId, "failed", null, null, result.ErrorMessage);
            Console.WriteLine($"Submission {submissionId} failed: {result.ErrorMessage}");
        }
        catch (HttpRequestException ex)
        {
            result.Status = "failed";
            result.ErrorMessage = $"awork API error: {ex.Message}";
            UpdateSubmissionStatus(submissionId, "failed", null, null, result.ErrorMessage);
            Console.WriteLine($"Submission {submissionId} failed: {result.ErrorMessage}");
        }
        catch (Exception ex)
        {
            result.Status = "failed";
            result.ErrorMessage = $"Processing error: {ex.Message}";
            UpdateSubmissionStatus(submissionId, "failed", null, null, result.ErrorMessage);
            Console.WriteLine($"Submission {submissionId} failed: {result.ErrorMessage}");
        }

        return result;
    }

    private SubmissionWithFormConfig? GetSubmissionWithFormConfig(int submissionId)
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();

        cmd.CommandText = @"
            SELECT
                s.Id, s.DataJson, s.Status,
                f.UserId, f.FieldsJson, f.ActionType,
                f.AworkProjectId, f.AworkProjectTypeId, f.FieldMappingsJson,
                f.AworkTaskListId, f.AworkTaskStatusId, f.AworkTypeOfWorkId,
                f.AworkAssigneeId, f.AworkTaskIsPriority
            FROM Submissions s
            JOIN Forms f ON s.FormId = f.Id
            WHERE s.Id = @id";

        cmd.Parameters.AddWithValue("@id", submissionId);

        using var reader = cmd.ExecuteReader();
        if (!reader.Read())
            return null;

        return new SubmissionWithFormConfig
        {
            SubmissionId = reader.GetInt32(0),
            DataJson = reader.GetString(1),
            Status = reader.GetString(2),
            FormUserId = reader.GetInt32(3),
            FieldsJson = reader.GetString(4),
            ActionType = reader.IsDBNull(5) ? null : reader.GetString(5),
            AworkProjectId = reader.IsDBNull(6) ? null : reader.GetString(6),
            AworkProjectTypeId = reader.IsDBNull(7) ? null : reader.GetString(7),
            FieldMappingsJson = reader.IsDBNull(8) ? null : reader.GetString(8),
            AworkTaskListId = reader.IsDBNull(9) ? null : reader.GetString(9),
            AworkTaskStatusId = reader.IsDBNull(10) ? null : reader.GetString(10),
            AworkTypeOfWorkId = reader.IsDBNull(11) ? null : reader.GetString(11),
            AworkAssigneeId = reader.IsDBNull(12) ? null : reader.GetString(12),
            AworkTaskIsPriority = reader.IsDBNull(13) ? null : reader.GetBoolean(13)
        };
    }

    private void UpdateSubmissionStatus(int submissionId, string status, string? projectId, string? taskId, string? errorMessage)
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();

        cmd.CommandText = @"
            UPDATE Submissions
            SET Status = @status,
                AworkProjectId = @projectId,
                AworkTaskId = @taskId,
                ErrorMessage = @error,
                UpdatedAt = @now
            WHERE Id = @id";

        cmd.Parameters.AddWithValue("@id", submissionId);
        cmd.Parameters.AddWithValue("@status", status);
        cmd.Parameters.AddWithValue("@projectId", (object?)projectId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@taskId", (object?)taskId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@error", (object?)errorMessage ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@now", DateTime.UtcNow.ToString("o"));

        cmd.ExecuteNonQuery();
    }

    private Dictionary<string, object?> ParseFormData(string dataJson)
    {
        try
        {
            var data = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(dataJson);
            if (data == null)
                return new Dictionary<string, object?>();

            // Convert JsonElements to proper types
            var result = new Dictionary<string, object?>();
            foreach (var kvp in data)
            {
                result[kvp.Key] = ConvertJsonElement(kvp.Value);
            }
            return result;
        }
        catch
        {
            return new Dictionary<string, object?>();
        }
    }

    private object? ConvertJsonElement(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.TryGetInt64(out var l) ? l : element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => element.ToString()
        };
    }

    private List<FormFieldInfo> ParseFormFields(string fieldsJson)
    {
        try
        {
            var fields = JsonSerializer.Deserialize<List<FormFieldInfo>>(fieldsJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            return fields ?? new List<FormFieldInfo>();
        }
        catch
        {
            return new List<FormFieldInfo>();
        }
    }

    private FieldMappingsData ParseFieldMappings(string? fieldMappingsJson)
    {
        if (string.IsNullOrEmpty(fieldMappingsJson))
            return new FieldMappingsData();

        try
        {
            var mappings = JsonSerializer.Deserialize<FieldMappingsData>(fieldMappingsJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            return mappings ?? new FieldMappingsData();
        }
        catch
        {
            return new FieldMappingsData();
        }
    }

    private string? GetMappedValue(
        Dictionary<string, object?> formData,
        List<FormFieldInfo> formFields,
        List<FieldMapping> mappings,
        string aworkField)
    {
        var mapping = mappings.FirstOrDefault(m => m.AworkField == aworkField);
        if (mapping == null)
            return null;

        // Find the form field by ID
        var formField = formFields.FirstOrDefault(f => f.Id == mapping.FormFieldId);
        if (formField == null)
            return null;

        // Look up the value in form data using the field ID
        if (formData.TryGetValue(formField.Id, out var value) && value != null)
        {
            return value.ToString();
        }

        return null;
    }

    private DateTime? GetMappedDateValue(
        Dictionary<string, object?> formData,
        List<FormFieldInfo> formFields,
        List<FieldMapping> mappings,
        string aworkField)
    {
        var stringValue = GetMappedValue(formData, formFields, mappings, aworkField);
        if (string.IsNullOrEmpty(stringValue))
            return null;

        if (DateTime.TryParse(stringValue, out var date))
            return date;

        return null;
    }

    private int? GetMappedIntValue(
        Dictionary<string, object?> formData,
        List<FormFieldInfo> formFields,
        List<FieldMapping> mappings,
        string aworkField)
    {
        var stringValue = GetMappedValue(formData, formFields, mappings, aworkField);
        if (string.IsNullOrEmpty(stringValue))
            return null;

        if (int.TryParse(stringValue, out var intValue))
            return intValue;

        return null;
    }

    private AworkCreateProjectRequest BuildProjectRequest(
        Dictionary<string, object?> formData,
        List<FormFieldInfo> formFields,
        List<FieldMapping> mappings,
        string? projectTypeId)
    {
        var name = GetMappedValue(formData, formFields, mappings, "name") ?? $"Form Submission - {DateTime.UtcNow:yyyy-MM-dd HH:mm}";
        var description = GetMappedValue(formData, formFields, mappings, "description");
        var startDate = GetMappedDateValue(formData, formFields, mappings, "startDate");
        var dueDate = GetMappedDateValue(formData, formFields, mappings, "dueDate");

        return new AworkCreateProjectRequest
        {
            Name = name,
            Description = description,
            ProjectTypeId = projectTypeId,
            StartDate = startDate,
            DueDate = dueDate
        };
    }

    private AworkCreateTaskRequest BuildTaskRequest(
        Dictionary<string, object?> formData,
        List<FormFieldInfo> formFields,
        List<FieldMapping> mappings,
        string? taskStatusId,
        string? typeOfWorkId,
        string? taskListId,
        string? assigneeId,
        bool isPriority)
    {
        var name = GetMappedValue(formData, formFields, mappings, "name") ?? $"Form Submission - {DateTime.UtcNow:yyyy-MM-dd HH:mm}";
        var description = GetMappedValue(formData, formFields, mappings, "description");
        var dueOn = GetMappedDateValue(formData, formFields, mappings, "dueOn");
        var startOn = GetMappedDateValue(formData, formFields, mappings, "startOn");
        var plannedDuration = GetMappedIntValue(formData, formFields, mappings, "plannedDuration");

        var request = new AworkCreateTaskRequest
        {
            Name = name,
            Description = description,
            IsPriority = isPriority,
            DueOn = dueOn,
            StartOn = startOn,
            PlannedDuration = plannedDuration,
            TaskStatusId = taskStatusId,
            TypeOfWorkId = typeOfWorkId,
            TaskListId = taskListId
        };

        // Add assignment if specified
        if (!string.IsNullOrEmpty(assigneeId))
        {
            request.Assignments = new List<AworkTaskAssignment>
            {
                new AworkTaskAssignment { UserId = assigneeId }
            };
        }

        return request;
    }
}

// Internal DTOs
internal class SubmissionWithFormConfig
{
    public int SubmissionId { get; set; }
    public string DataJson { get; set; } = "{}";
    public string Status { get; set; } = "pending";
    public int FormUserId { get; set; }
    public string FieldsJson { get; set; } = "[]";
    public string? ActionType { get; set; }
    public string? AworkProjectId { get; set; }
    public string? AworkProjectTypeId { get; set; }
    public string? FieldMappingsJson { get; set; }
    public string? AworkTaskListId { get; set; }
    public string? AworkTaskStatusId { get; set; }
    public string? AworkTypeOfWorkId { get; set; }
    public string? AworkAssigneeId { get; set; }
    public bool? AworkTaskIsPriority { get; set; }
}

internal class FormFieldInfo
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

internal class FieldMappingsData
{
    public List<FieldMapping> TaskFieldMappings { get; set; } = new();
    public List<FieldMapping> ProjectFieldMappings { get; set; } = new();
}

internal class FieldMapping
{
    public string FormFieldId { get; set; } = string.Empty;
    public string AworkField { get; set; } = string.Empty;
    public string AworkFieldLabel { get; set; } = string.Empty;
}

public class SubmissionProcessResult
{
    public int SubmissionId { get; set; }
    public string Status { get; set; } = "pending";
    public string? AworkProjectId { get; set; }
    public string? AworkTaskId { get; set; }
    public string? ErrorMessage { get; set; }
}
