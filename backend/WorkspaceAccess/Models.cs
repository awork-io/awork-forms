namespace Backend.WorkspaceAccess;

public class WorkspaceAccessSettingsDto
{
    public bool AllowAllUsers { get; set; }
    public List<Guid> AllowedUserIds { get; set; } = [];
}

public class UpdateWorkspaceAccessSettingsRequest
{
    public bool AllowAllUsers { get; set; } = true;
    public List<Guid>? AllowedUserIds { get; set; }
}
