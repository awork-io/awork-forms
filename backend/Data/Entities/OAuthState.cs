namespace Backend.Data.Entities;

public class OAuthState
{
    public int Id { get; set; }
    public string State { get; set; } = string.Empty;
    public string CodeVerifier { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
