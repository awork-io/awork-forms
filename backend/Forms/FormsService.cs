using System.Text.Json;
using Backend.Data;
using Backend.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Forms;

public class ValidationException(string message) : Exception(message);
public enum DeleteFormResult
{
    Deleted,
    NotFound,
    Forbidden
}

public class FormsService
{
    private readonly IDbContextFactory<AppDbContext> _dbFactory;

    public FormsService(IDbContextFactory<AppDbContext> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public List<FormListDto> GetFormsByUser(Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var workspaceId = GetWorkspaceId(db, userId);
        if (workspaceId == null) return [];
        return ApplyFormAccessFilter(db.Forms, workspaceId.Value, userId)
            .OrderByDescending(f => f.UpdatedAt)
            .Select(f => new FormListDto
            {
                Id = f.Id,
                PublicId = f.PublicId,
                CreatedBy = f.CreatedBy,
                UpdatedBy = f.UpdatedBy,
                CreatedByName = db.Users.Where(u => u.Id == f.CreatedBy).Select(u => u.Name).FirstOrDefault(),
                UpdatedByName = db.Users.Where(u => u.Id == f.UpdatedBy).Select(u => u.Name).FirstOrDefault(),
                Name = f.Name,
                Description = f.Description,
                IsSharedWithWorkspace = f.IsSharedWithWorkspace,
                IsActive = f.IsActive,
                CreatedAt = f.CreatedAt,
                UpdatedAt = f.UpdatedAt,
                SubmissionCount = f.Submissions.Count,
                FieldCount = CountFields(f.FieldsJson)
            })
            .ToList();
    }

    public FormDetailDto? GetFormById(int formId, Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var workspaceId = GetWorkspaceId(db, userId);
        if (workspaceId == null) return null;
        var form = ApplyFormAccessFilter(db.Forms, workspaceId.Value, userId)
            .FirstOrDefault(f => f.Id == formId);
        if (form == null) return null;
        return MapToDetailDto(db, form);
    }

    public FormDetailDto CreateForm(CreateFormDto dto, Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var user = db.Users.FirstOrDefault(u => u.Id == userId);
        if (user == null)
            throw new InvalidOperationException("User not found");
        var now = DateTime.UtcNow;

        var form = new Form
        {
            PublicId = Guid.NewGuid(),
            WorkspaceId = user.AworkWorkspaceId,
            CreatedBy = userId,
            UpdatedBy = userId,
            Name = dto.Name,
            Description = dto.Description,
            NameTranslationsJson = SerializeTranslations(dto.NameTranslations),
            DescriptionTranslationsJson = SerializeTranslations(dto.DescriptionTranslations),
            FieldsJson = dto.FieldsJson ?? "[]",
            ActionType = dto.ActionType,
            AworkProjectId = dto.AworkProjectId,
            AworkProjectTypeId = dto.AworkProjectTypeId,
            AworkTaskListId = dto.AworkTaskListId,
            AworkTaskStatusId = dto.AworkTaskStatusId,
            AworkTypeOfWorkId = dto.AworkTypeOfWorkId,
            AworkAssigneeId = dto.AworkAssigneeId,
            AworkTaskIsPriority = dto.AworkTaskIsPriority,
            AworkTaskTag = dto.AworkTaskTag,
            FieldMappingsJson = dto.FieldMappingsJson,
            PrimaryColor = dto.PrimaryColor,
            BackgroundColor = dto.BackgroundColor,
            IsSharedWithWorkspace = dto.IsSharedWithWorkspace ?? true,
            IsActive = dto.IsActive ?? true,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Forms.Add(form);
        db.SaveChanges();

        return MapToDetailDto(db, form);
    }

    public FormDetailDto? DuplicateForm(int formId, Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var workspaceId = GetWorkspaceId(db, userId);
        if (workspaceId == null) return null;

        var source = ApplyFormAccessFilter(db.Forms, workspaceId.Value, userId)
            .FirstOrDefault(f => f.Id == formId);
        if (source == null) return null;

        var now = DateTime.UtcNow;
        var publicId = Guid.NewGuid();
        var duplicateName = GenerateDuplicateName(db, workspaceId.Value, source.Name);
        var duplicated = new Form
        {
            PublicId = publicId,
            WorkspaceId = source.WorkspaceId,
            CreatedBy = userId,
            UpdatedBy = userId,
            Name = duplicateName,
            Description = source.Description,
            NameTranslationsJson = source.NameTranslationsJson,
            DescriptionTranslationsJson = source.DescriptionTranslationsJson,
            FieldsJson = source.FieldsJson,
            ActionType = source.ActionType,
            AworkProjectId = source.AworkProjectId,
            AworkProjectTypeId = source.AworkProjectTypeId,
            AworkTaskListId = source.AworkTaskListId,
            AworkTaskStatusId = source.AworkTaskStatusId,
            AworkTypeOfWorkId = source.AworkTypeOfWorkId,
            AworkAssigneeId = source.AworkAssigneeId,
            AworkTaskIsPriority = source.AworkTaskIsPriority,
            AworkTaskTag = source.AworkTaskTag,
            FieldMappingsJson = source.FieldMappingsJson,
            PrimaryColor = source.PrimaryColor,
            BackgroundColor = source.BackgroundColor,
            LogoData = source.LogoData,
            LogoContentType = source.LogoContentType,
            LogoUrl = source.LogoData != null ? $"/api/f/{publicId}/logo" : null,
            IsSharedWithWorkspace = source.IsSharedWithWorkspace,
            IsActive = source.IsActive,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Forms.Add(duplicated);
        db.SaveChanges();

        return MapToDetailDto(db, duplicated);
    }

    private static string GenerateDuplicateName(AppDbContext db, Guid workspaceId, string sourceName)
    {
        var baseName = $"{sourceName} Copy";
        var existingNames = db.Forms
            .Where(f => f.WorkspaceId == workspaceId)
            .Select(f => f.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (!existingNames.Contains(baseName))
            return baseName;

        var counter = 2;
        while (existingNames.Contains($"{baseName} {counter}"))
        {
            counter++;
        }

        return $"{baseName} {counter}";
    }

    public FormDetailDto? UpdateForm(int formId, UpdateFormDto dto, Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var workspaceId = GetWorkspaceId(db, userId);
        if (workspaceId == null) return null;
        var form = ApplyFormAccessFilter(db.Forms, workspaceId.Value, userId)
            .FirstOrDefault(f => f.Id == formId);
        if (form == null) return null;

        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ValidationException("Form name is required.");

        form.Name = dto.Name.Trim();
        form.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        form.NameTranslationsJson = SerializeTranslations(dto.NameTranslations);
        form.DescriptionTranslationsJson = SerializeTranslations(dto.DescriptionTranslations);
        form.FieldsJson = string.IsNullOrWhiteSpace(dto.FieldsJson) ? "[]" : dto.FieldsJson;
        form.ActionType = string.IsNullOrWhiteSpace(dto.ActionType) ? null : dto.ActionType;
        form.AworkProjectId = dto.AworkProjectId;
        form.AworkProjectTypeId = dto.AworkProjectTypeId;
        form.AworkTaskListId = dto.AworkTaskListId;
        form.AworkTaskStatusId = dto.AworkTaskStatusId;
        form.AworkTypeOfWorkId = dto.AworkTypeOfWorkId;
        form.AworkAssigneeId = dto.AworkAssigneeId;
        form.AworkTaskIsPriority = dto.AworkTaskIsPriority;
        form.AworkTaskTag = string.IsNullOrWhiteSpace(dto.AworkTaskTag) ? null : dto.AworkTaskTag.Trim();
        form.FieldMappingsJson = string.IsNullOrWhiteSpace(dto.FieldMappingsJson) ? null : dto.FieldMappingsJson;
        form.PrimaryColor = string.IsNullOrWhiteSpace(dto.PrimaryColor) ? null : dto.PrimaryColor;
        form.BackgroundColor = string.IsNullOrWhiteSpace(dto.BackgroundColor) ? null : dto.BackgroundColor;
        form.LogoUrl = string.IsNullOrWhiteSpace(dto.LogoUrl) ? null : dto.LogoUrl;
        form.IsSharedWithWorkspace = dto.IsSharedWithWorkspace ?? form.IsSharedWithWorkspace;
        form.IsActive = dto.IsActive ?? form.IsActive;

        var typeOfWorkError = ValidateTypeOfWork(form.ActionType, form.AworkTypeOfWorkId, form.FieldMappingsJson, form.FieldsJson);
        if (typeOfWorkError != null)
            throw new ValidationException(typeOfWorkError);

        form.UpdatedBy = userId;
        form.UpdatedAt = DateTime.UtcNow;
        db.SaveChanges();

        return MapToDetailDto(db, form);
    }

    public DeleteFormResult DeleteForm(int formId, Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var workspaceId = GetWorkspaceId(db, userId);
        if (workspaceId == null) return DeleteFormResult.NotFound;

        var form = ApplyFormAccessFilter(db.Forms, workspaceId.Value, userId)
            .FirstOrDefault(f => f.Id == formId);
        if (form == null) return DeleteFormResult.NotFound;

        if (form.CreatedBy != userId)
            return DeleteFormResult.Forbidden;

        db.Forms.Remove(form);
        db.SaveChanges();
        return DeleteFormResult.Deleted;
    }

    public PublicFormDto? GetPublicFormByPublicId(Guid publicId)
    {
        using var db = _dbFactory.CreateDbContext();
        var form = db.Forms.FirstOrDefault(f => f.PublicId == publicId);
        if (form == null) return null;

        return new PublicFormDto
        {
            Id = form.Id,
            PublicId = form.PublicId,
            Name = form.Name,
            Description = form.Description,
            NameTranslations = DeserializeTranslations(form.NameTranslationsJson),
            DescriptionTranslations = DeserializeTranslations(form.DescriptionTranslationsJson),
            FieldsJson = form.FieldsJson,
            PrimaryColor = form.PrimaryColor,
            BackgroundColor = form.BackgroundColor,
            LogoUrl = form.LogoUrl,
            IsActive = form.IsActive
        };
    }

    public SubmissionDto CreateSubmission(int formId, string dataJson)
    {
        using var db = _dbFactory.CreateDbContext();
        var now = DateTime.UtcNow;

        var submission = new Submission
        {
            FormId = formId,
            DataJson = dataJson,
            Status = "pending",
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Submissions.Add(submission);
        db.SaveChanges();

        return new SubmissionDto
        {
            Id = submission.Id,
            FormId = submission.FormId,
            DataJson = submission.DataJson,
            Status = submission.Status,
            CreatedAt = submission.CreatedAt
        };
    }

    public List<SubmissionListDto> GetSubmissionsByUser(Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var workspaceId = GetWorkspaceId(db, userId);
        if (workspaceId == null) return [];
        return db.Submissions
            .Include(s => s.Form)
            .Where(s => s.Form.WorkspaceId == workspaceId &&
                (s.Form.IsSharedWithWorkspace || s.Form.CreatedBy == userId))
            .OrderByDescending(s => s.CreatedAt)
            .Select(MapToSubmissionListDto())
            .ToList();
    }

    public List<SubmissionListDto> GetSubmissionsByForm(int formId, Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var workspaceId = GetWorkspaceId(db, userId);
        if (workspaceId == null) return [];
        return db.Submissions
            .Include(s => s.Form)
            .Where(s => s.FormId == formId &&
                s.Form.WorkspaceId == workspaceId &&
                (s.Form.IsSharedWithWorkspace || s.Form.CreatedBy == userId))
            .OrderByDescending(s => s.CreatedAt)
            .Select(MapToSubmissionListDto())
            .ToList();
    }

    public SubmissionListDto? GetSubmissionById(int submissionId, Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var workspaceId = GetWorkspaceId(db, userId);
        if (workspaceId == null) return null;

        return db.Submissions
            .Include(s => s.Form)
            .Where(s => s.Id == submissionId &&
                s.Form.WorkspaceId == workspaceId &&
                (s.Form.IsSharedWithWorkspace || s.Form.CreatedBy == userId))
            .Select(MapToSubmissionListDto())
            .FirstOrDefault();
    }

    public bool PrepareFailedSubmissionRetry(int submissionId, Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var workspaceId = GetWorkspaceId(db, userId);
        if (workspaceId == null) return false;

        var submission = db.Submissions
            .Include(s => s.Form)
            .FirstOrDefault(s => s.Id == submissionId &&
                s.Form.WorkspaceId == workspaceId &&
                (s.Form.IsSharedWithWorkspace || s.Form.CreatedBy == userId));

        if (submission == null || !string.Equals(submission.Status, "failed", StringComparison.OrdinalIgnoreCase))
            return false;

        submission.Status = "pending";
        submission.AworkProjectId = null;
        submission.AworkTaskId = null;
        submission.ErrorMessage = null;
        submission.UpdatedAt = DateTime.UtcNow;
        db.SaveChanges();

        return true;
    }

    private static FormDetailDto MapToDetailDto(AppDbContext db, Form form) => new()
    {
        Id = form.Id,
        PublicId = form.PublicId,
        CreatedBy = form.CreatedBy,
        UpdatedBy = form.UpdatedBy,
        CreatedByName = db.Users.Where(u => u.Id == form.CreatedBy).Select(u => u.Name).FirstOrDefault(),
        UpdatedByName = db.Users.Where(u => u.Id == form.UpdatedBy).Select(u => u.Name).FirstOrDefault(),
        Name = form.Name,
        Description = form.Description,
        NameTranslations = DeserializeTranslations(form.NameTranslationsJson),
        DescriptionTranslations = DeserializeTranslations(form.DescriptionTranslationsJson),
        FieldsJson = form.FieldsJson,
        ActionType = form.ActionType,
        AworkProjectId = form.AworkProjectId,
        AworkProjectTypeId = form.AworkProjectTypeId,
        AworkTaskListId = form.AworkTaskListId,
        AworkTaskStatusId = form.AworkTaskStatusId,
        AworkTypeOfWorkId = form.AworkTypeOfWorkId,
        AworkAssigneeId = form.AworkAssigneeId,
        AworkTaskIsPriority = form.AworkTaskIsPriority,
        AworkTaskTag = form.AworkTaskTag,
        FieldMappingsJson = form.FieldMappingsJson,
        PrimaryColor = form.PrimaryColor,
        BackgroundColor = form.BackgroundColor,
        LogoUrl = form.LogoUrl,
        IsSharedWithWorkspace = form.IsSharedWithWorkspace,
        IsActive = form.IsActive,
        CreatedAt = form.CreatedAt,
        UpdatedAt = form.UpdatedAt
    };

    private static IQueryable<Form> ApplyFormAccessFilter(IQueryable<Form> forms, Guid workspaceId, Guid userId)
    {
        return forms.Where(f => f.WorkspaceId == workspaceId &&
            (f.IsSharedWithWorkspace || f.CreatedBy == userId));
    }

    private static System.Linq.Expressions.Expression<Func<Submission, SubmissionListDto>> MapToSubmissionListDto() => s => new SubmissionListDto
    {
        Id = s.Id,
        FormId = s.FormId,
        FormName = s.Form.Name,
        DataJson = s.DataJson,
        Status = s.Status,
        AworkProjectId = s.AworkProjectId,
        AworkTaskId = s.AworkTaskId,
        ErrorMessage = s.ErrorMessage,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt
    };

    private static Dictionary<string, string>? DeserializeTranslations(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json);
        }
        catch
        {
            return null;
        }
    }

    private static string? SerializeTranslations(Dictionary<string, string>? translations)
    {
        if (translations == null) return null;

        var trimmed = translations
            .Where(kv => !string.IsNullOrWhiteSpace(kv.Key) && !string.IsNullOrWhiteSpace(kv.Value))
            .ToDictionary(kv => kv.Key.Trim(), kv => kv.Value.Trim());

        if (trimmed.Count == 0) return null;
        return JsonSerializer.Serialize(trimmed);
    }

    private static int CountFields(string fieldsJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(fieldsJson);
            return doc.RootElement.GetArrayLength();
        }
        catch { return 0; }
    }

    private static Guid? GetWorkspaceId(AppDbContext db, Guid userId)
    {
        var workspaceId = db.Users
            .Where(u => u.Id == userId)
            .Select(u => (Guid?)u.AworkWorkspaceId)
            .FirstOrDefault();

        if (workspaceId == null || workspaceId == Guid.Empty) return null;
        return workspaceId;
    }

    /// <summary>
    /// Validates that a form with task action type has a type of work configured
    /// either as a default or via a required field mapping.
    /// Returns null if valid, or an error message string if invalid.
    /// </summary>
    public static string? ValidateTypeOfWork(string? actionType, Guid? typeOfWorkId, string? fieldMappingsJson, string? fieldsJson)
    {
        if (actionType != "task" && actionType != "both")
            return null;

        if (typeOfWorkId != null)
            return null;

        // Check if there's a typeOfWork field mapping
        if (string.IsNullOrEmpty(fieldMappingsJson))
            return "Type of work is required when creating tasks. Set a default or map a form field to it.";

        try
        {
            using var mappingsDoc = JsonDocument.Parse(fieldMappingsJson);
            var root = mappingsDoc.RootElement;
            if (!root.TryGetProperty("taskFieldMappings", out var taskMappings) || taskMappings.ValueKind != JsonValueKind.Array)
                return "Type of work is required when creating tasks. Set a default or map a form field to it.";

            string? typeOfWorkFieldId = null;
            foreach (var mapping in taskMappings.EnumerateArray())
            {
                if (mapping.TryGetProperty("aworkField", out var aworkField) &&
                    string.Equals(aworkField.GetString(), "typeOfWork", StringComparison.OrdinalIgnoreCase))
                {
                    if (mapping.TryGetProperty("formFieldId", out var fieldId))
                        typeOfWorkFieldId = fieldId.GetString();
                    break;
                }
            }

            if (typeOfWorkFieldId == null)
                return "Type of work is required when creating tasks. Set a default or map a form field to it.";

            // Verify the mapped field is required
            if (string.IsNullOrEmpty(fieldsJson))
                return "The form field mapped to type of work must be marked as required.";

            using var fieldsDoc = JsonDocument.Parse(fieldsJson);
            foreach (var field in fieldsDoc.RootElement.EnumerateArray())
            {
                if (field.TryGetProperty("id", out var id) && id.GetString() == typeOfWorkFieldId)
                {
                    if (field.TryGetProperty("required", out var required) && required.GetBoolean())
                        return null; // Valid: mapped field is required
                    return "The form field mapped to type of work must be marked as required.";
                }
            }

            return "The form field mapped to type of work references a field that does not exist.";
        }
        catch
        {
            return "Type of work is required when creating tasks. Set a default or map a form field to it.";
        }
    }
}
