namespace Backend.Data.Entities;

public class WorkspaceAccessPolicy
{
    public int Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public bool AllowAllUsers { get; set; } = true;
    public string AllowedUserIdsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
