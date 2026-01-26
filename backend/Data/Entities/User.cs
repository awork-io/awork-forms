namespace Backend.Data.Entities;

public class User
{
    public int Id { get; set; }
    public string AworkUserId { get; set; } = string.Empty;
    public string AworkWorkspaceId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? TokenExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Form> Forms { get; set; } = [];
}
