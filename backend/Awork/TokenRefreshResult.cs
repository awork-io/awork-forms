namespace Backend.Awork;

public class TokenRefreshResult
{
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
}
