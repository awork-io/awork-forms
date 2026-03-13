namespace Backend.Auth;

public class AworkUserPermission
{
    public bool IsAdmin { get; set; }
    public List<AworkPermission>? Permissions { get; set; }
}
