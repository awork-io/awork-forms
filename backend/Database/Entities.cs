namespace Backend.Database;

public class User
{
    public int Id { get; set; }
    public string AworkUserId { get; set; } = string.Empty;
    public string AworkWorkspaceId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? TokenExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Form
{
    public int Id { get; set; }
    public Guid PublicId { get; set; } = Guid.NewGuid();
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string FieldsJson { get; set; } = "[]";
    public string? ActionType { get; set; } // "task", "project", or "both"
    public string? AworkProjectId { get; set; }
    public string? AworkProjectTypeId { get; set; }
    public string? FieldMappingsJson { get; set; }
    public string? PrimaryColor { get; set; }
    public string? BackgroundColor { get; set; }
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Submission
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public string DataJson { get; set; } = "{}";
    public string Status { get; set; } = "pending"; // "pending", "completed", "failed"
    public string? AworkProjectId { get; set; }
    public string? AworkTaskId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
