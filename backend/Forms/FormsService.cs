using System.Text.Json;
using Backend.Data;
using Backend.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Forms;

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
        return db.Forms
            .Where(f => f.WorkspaceId == workspaceId)
            .OrderByDescending(f => f.UpdatedAt)
            .Select(f => new FormListDto
            {
                Id = f.Id,
                PublicId = f.PublicId,
                Name = f.Name,
                Description = f.Description,
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
        var form = db.Forms.FirstOrDefault(f => f.Id == formId && f.WorkspaceId == workspaceId);
        if (form == null) return null;
        return MapToDetailDto(form);
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
            FieldMappingsJson = dto.FieldMappingsJson,
            PrimaryColor = dto.PrimaryColor,
            BackgroundColor = dto.BackgroundColor,
            IsActive = dto.IsActive ?? true,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Forms.Add(form);
        db.SaveChanges();

        return MapToDetailDto(form);
    }

    public FormDetailDto? UpdateForm(int formId, UpdateFormDto dto, Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var workspaceId = GetWorkspaceId(db, userId);
        if (workspaceId == null) return null;
        var form = db.Forms.FirstOrDefault(f => f.Id == formId && f.WorkspaceId == workspaceId);
        if (form == null) return null;

        if (dto.Name != null) form.Name = dto.Name;
        if (dto.Description != null) form.Description = dto.Description;
        if (dto.NameTranslations != null) form.NameTranslationsJson = SerializeTranslations(dto.NameTranslations);
        if (dto.DescriptionTranslations != null) form.DescriptionTranslationsJson = SerializeTranslations(dto.DescriptionTranslations);
        if (dto.FieldsJson != null) form.FieldsJson = dto.FieldsJson;
        if (dto.ActionType != null) form.ActionType = dto.ActionType;
        if (dto.AworkProjectId != null) form.AworkProjectId = dto.AworkProjectId;
        if (dto.AworkProjectTypeId != null) form.AworkProjectTypeId = dto.AworkProjectTypeId;
        if (dto.AworkTaskListId != null) form.AworkTaskListId = dto.AworkTaskListId;
        if (dto.AworkTaskStatusId != null) form.AworkTaskStatusId = dto.AworkTaskStatusId;
        if (dto.AworkTypeOfWorkId != null) form.AworkTypeOfWorkId = dto.AworkTypeOfWorkId;
        if (dto.AworkAssigneeId != null) form.AworkAssigneeId = dto.AworkAssigneeId;
        if (dto.AworkTaskIsPriority != null) form.AworkTaskIsPriority = dto.AworkTaskIsPriority;
        if (dto.FieldMappingsJson != null) form.FieldMappingsJson = dto.FieldMappingsJson;
        if (dto.PrimaryColor != null) form.PrimaryColor = dto.PrimaryColor;
        if (dto.BackgroundColor != null) form.BackgroundColor = dto.BackgroundColor;
        if (dto.LogoUrl != null) form.LogoUrl = dto.LogoUrl == "" ? null : dto.LogoUrl;
        if (dto.IsActive != null) form.IsActive = dto.IsActive.Value;

        form.UpdatedAt = DateTime.UtcNow;
        db.SaveChanges();

        return MapToDetailDto(form);
    }

    public bool DeleteForm(int formId, Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var workspaceId = GetWorkspaceId(db, userId);
        if (workspaceId == null) return false;
        var form = db.Forms.FirstOrDefault(f => f.Id == formId && f.WorkspaceId == workspaceId);
        if (form == null) return false;

        db.Forms.Remove(form);
        db.SaveChanges();
        return true;
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
            .Where(s => s.Form.WorkspaceId == workspaceId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SubmissionListDto
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
            })
            .ToList();
    }

    public List<SubmissionListDto> GetSubmissionsByForm(int formId, Guid userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var workspaceId = GetWorkspaceId(db, userId);
        if (workspaceId == null) return [];
        return db.Submissions
            .Include(s => s.Form)
            .Where(s => s.FormId == formId && s.Form.WorkspaceId == workspaceId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SubmissionListDto
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
            })
            .ToList();
    }

    private static FormDetailDto MapToDetailDto(Form form) => new()
    {
        Id = form.Id,
        PublicId = form.PublicId,
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
        FieldMappingsJson = form.FieldMappingsJson,
        PrimaryColor = form.PrimaryColor,
        BackgroundColor = form.BackgroundColor,
        LogoUrl = form.LogoUrl,
        IsActive = form.IsActive,
        CreatedAt = form.CreatedAt,
        UpdatedAt = form.UpdatedAt
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
}
