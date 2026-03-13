namespace Backend.Auth;

public class UserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public Guid WorkspaceId { get; set; }
    public string? WorkspaceName { get; set; }
    public string? WorkspaceUrl { get; set; }
    public bool HasRefreshToken { get; set; }
    public bool IsAworkAdmin { get; set; }
    public bool CanManageWorkspaceAccess { get; set; }
    public bool HasFormsAccess { get; set; }
}
