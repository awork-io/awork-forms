namespace Backend.Data.Entities;

public class Form
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string FieldsJson { get; set; } = "[]";
    public string? ActionType { get; set; }
    public string? AworkProjectId { get; set; }
    public string? AworkProjectTypeId { get; set; }
    public string? AworkTaskListId { get; set; }
    public string? AworkTaskStatusId { get; set; }
    public string? AworkTypeOfWorkId { get; set; }
    public string? AworkAssigneeId { get; set; }
    public bool? AworkTaskIsPriority { get; set; }
    public string? FieldMappingsJson { get; set; }
    public string? PrimaryColor { get; set; }
    public string? BackgroundColor { get; set; }
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<Submission> Submissions { get; set; } = [];
}
