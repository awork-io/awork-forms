using System.Text.Json.Serialization;

namespace Backend.Auth;

public class PkceState
{
    public required string CodeVerifier { get; set; }
    public required string ClientId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DcrResponse
{
    [JsonPropertyName("client_id")]
    public string ClientId { get; set; } = string.Empty;

    [JsonPropertyName("client_secret")]
    public string? ClientSecret { get; set; }

    [JsonPropertyName("scope")]
    public string? Scope { get; set; }
}

public class AuthInitResult
{
    public required string AuthorizationUrl { get; set; }
    public required string State { get; set; }
}

public class AuthCallbackResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public string? SessionToken { get; set; }
    public UserDto? User { get; set; }
}

public class TokenResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
}

public class UserDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string WorkspaceId { get; set; } = string.Empty;
}

public class AuthTokenResponse
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("refresh_token")]
    public string? RefreshToken { get; set; }

    [JsonPropertyName("expires_in")]
    public int ExpiresIn { get; set; }

    [JsonPropertyName("token_type")]
    public string TokenType { get; set; } = string.Empty;
}

public class AworkUserInfo
{
    public string Id { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? ProfileImage { get; set; }
    public string? WorkspaceId { get; set; }
}
