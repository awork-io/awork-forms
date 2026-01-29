namespace Backend.Data.Entities;

public class Form
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? NameTranslationsJson { get; set; }
    public string? DescriptionTranslationsJson { get; set; }
    public string FieldsJson { get; set; } = "[]";
    public string? ActionType { get; set; }
    public Guid? AworkProjectId { get; set; }
    public Guid? AworkProjectTypeId { get; set; }
    public Guid? AworkTaskListId { get; set; }
    public Guid? AworkTaskStatusId { get; set; }
    public Guid? AworkTypeOfWorkId { get; set; }
    public Guid? AworkAssigneeId { get; set; }
    public bool? AworkTaskIsPriority { get; set; }
    public string? AworkTaskTag { get; set; }
    public string? FieldMappingsJson { get; set; }
    public string? PrimaryColor { get; set; }
    public string? BackgroundColor { get; set; }
    public string? LogoUrl { get; set; }
    public byte[]? LogoData { get; set; }
    public string? LogoContentType { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<Submission> Submissions { get; set; } = [];
}
