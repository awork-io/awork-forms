namespace Backend.Auth;

public class AworkUserInfo
{
    public Guid Id { get; set; }
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? ProfileImage { get; set; }
    public Guid? WorkspaceId { get; set; }
    public Guid? AccountId { get; set; }
    public AworkWorkspaceInfo? Workspace { get; set; }
}
