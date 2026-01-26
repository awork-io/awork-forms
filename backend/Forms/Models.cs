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
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateFormDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? FieldsJson { get; set; }
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
    public bool? IsActive { get; set; }
}

public class UpdateFormDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? FieldsJson { get; set; }
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
    public bool? IsActive { get; set; }
}

public class PublicFormDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
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
    public string? AworkProjectId { get; set; }
    public string? AworkTaskId { get; set; }
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
    public string? AworkProjectId { get; set; }
    public string? AworkTaskId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
