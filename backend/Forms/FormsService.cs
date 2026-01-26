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

    public List<FormListDto> GetFormsByUser(int userId)
    {
        using var db = _dbFactory.CreateDbContext();
        return db.Forms
            .Where(f => f.UserId == userId)
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

    public FormDetailDto? GetFormById(int formId, int userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var form = db.Forms.FirstOrDefault(f => f.Id == formId && f.UserId == userId);
        if (form == null) return null;
        return MapToDetailDto(form);
    }

    public FormDetailDto CreateForm(CreateFormDto dto, int userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var now = DateTime.UtcNow;

        var form = new Form
        {
            PublicId = Guid.NewGuid(),
            UserId = userId,
            Name = dto.Name,
            Description = dto.Description,
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

    public FormDetailDto? UpdateForm(int formId, UpdateFormDto dto, int userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var form = db.Forms.FirstOrDefault(f => f.Id == formId && f.UserId == userId);
        if (form == null) return null;

        if (dto.Name != null) form.Name = dto.Name;
        if (dto.Description != null) form.Description = dto.Description;
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

    public bool DeleteForm(int formId, int userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var form = db.Forms.FirstOrDefault(f => f.Id == formId && f.UserId == userId);
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

    public List<SubmissionListDto> GetSubmissionsByUser(int userId)
    {
        using var db = _dbFactory.CreateDbContext();
        return db.Submissions
            .Include(s => s.Form)
            .Where(s => s.Form.UserId == userId)
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

    public List<SubmissionListDto> GetSubmissionsByForm(int formId, int userId)
    {
        using var db = _dbFactory.CreateDbContext();
        return db.Submissions
            .Include(s => s.Form)
            .Where(s => s.FormId == formId && s.Form.UserId == userId)
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

    private static int CountFields(string fieldsJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(fieldsJson);
            return doc.RootElement.GetArrayLength();
        }
        catch { return 0; }
    }
}
