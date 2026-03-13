namespace Backend.WorkspaceAccess;

public class UpdateWorkspaceAccessSettingsRequest
{
    public bool AllowAllUsers { get; set; } = true;
    public List<Guid>? AllowedUserIds { get; set; }
}
