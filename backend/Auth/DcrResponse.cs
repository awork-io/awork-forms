using System.Text.Json.Serialization;

namespace Backend.Auth;

public class DcrResponse
{
    [JsonPropertyName("client_id")]
    public string ClientId { get; set; } = string.Empty;

    [JsonPropertyName("client_secret")]
    public string? ClientSecret { get; set; }

    [JsonPropertyName("scope")]
    public string? Scope { get; set; }
}
