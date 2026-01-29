using System.Text.Json.Serialization;

namespace Backend.Forms;

public class FormListDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int SubmissionCount { get; set; }
    public int FieldCount { get; set; }
}

public class FormDetailDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Dictionary<string, string>? NameTranslations { get; set; }
    public Dictionary<string, string>? DescriptionTranslations { get; set; }
    public string FieldsJson { get; set; } = "[]";
    public string? ActionType { get; set; }
    public Guid? AworkProjectId { get; set; }
    public Guid? AworkProjectTypeId { get; set; }
    public Guid? AworkTaskListId { get; set; }
    public Guid? AworkTaskStatusId { get; set; }
    public Guid? AworkTypeOfWorkId { get; set; }
    public Guid? AworkAssigneeId { get; set; }
    public bool? AworkTaskIsPriority { get; set; }
    [JsonPropertyName("aworkTaskTag")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? AworkTaskTag { get; set; }
    public string? FieldMappingsJson { get; set; }
    public string? PrimaryColor { get; set; }
    public string? BackgroundColor { get; set; }
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateFormDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Dictionary<string, string>? NameTranslations { get; set; }
    public Dictionary<string, string>? DescriptionTranslations { get; set; }
    public string? FieldsJson { get; set; }
    public string? ActionType { get; set; }
    public Guid? AworkProjectId { get; set; }
    public Guid? AworkProjectTypeId { get; set; }
    public Guid? AworkTaskListId { get; set; }
    public Guid? AworkTaskStatusId { get; set; }
    public Guid? AworkTypeOfWorkId { get; set; }
    public Guid? AworkAssigneeId { get; set; }
    public bool? AworkTaskIsPriority { get; set; }
    [JsonPropertyName("aworkTaskTag")]
    public string? AworkTaskTag { get; set; }
    public string? FieldMappingsJson { get; set; }
    public string? PrimaryColor { get; set; }
    public string? BackgroundColor { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateFormDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public Dictionary<string, string>? NameTranslations { get; set; }
    public Dictionary<string, string>? DescriptionTranslations { get; set; }
    public string? FieldsJson { get; set; }
    public string? ActionType { get; set; }
    public Guid? AworkProjectId { get; set; }
    public Guid? AworkProjectTypeId { get; set; }
    public Guid? AworkTaskListId { get; set; }
    public Guid? AworkTaskStatusId { get; set; }
    public Guid? AworkTypeOfWorkId { get; set; }
    public Guid? AworkAssigneeId { get; set; }
    public bool? AworkTaskIsPriority { get; set; }
    [JsonPropertyName("aworkTaskTag")]
    public string? AworkTaskTag { get; set; }
    public string? FieldMappingsJson { get; set; }
    public string? PrimaryColor { get; set; }
    public string? BackgroundColor { get; set; }
    public string? LogoUrl { get; set; }
    public bool? IsActive { get; set; }
}

public class PublicFormDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Dictionary<string, string>? NameTranslations { get; set; }
    public Dictionary<string, string>? DescriptionTranslations { get; set; }
    public string FieldsJson { get; set; } = "[]";
    public string? PrimaryColor { get; set; }
    public string? BackgroundColor { get; set; }
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; }
}

public class SubmissionDto
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public string DataJson { get; set; } = "{}";
    public string Status { get; set; } = "pending";
    public Guid? AworkProjectId { get; set; }
    public Guid? AworkTaskId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateSubmissionDto
{
    public Dictionary<string, object> Data { get; set; } = new();
}

public class SubmissionListDto
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public string FormName { get; set; } = string.Empty;
    public string DataJson { get; set; } = "{}";
    public string Status { get; set; } = "pending";
    public Guid? AworkProjectId { get; set; }
    public Guid? AworkTaskId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
