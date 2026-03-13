using Backend.Data.Entities;

namespace Backend.Auth;

public class AuthCallbackResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public string? SessionToken { get; set; }
    public User? User { get; set; }
}
