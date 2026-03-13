namespace Backend.Auth;

public class AuthInitResult
{
    public required string AuthorizationUrl { get; set; }
    public required string State { get; set; }
}
