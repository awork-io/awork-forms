using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Backend.Database;

namespace Backend.Auth;

public class AuthService
{
    private readonly HttpClient _httpClient;
    private readonly DbContextFactory _dbFactory;
    private readonly JwtService _jwtService;
    private readonly string _redirectUri;
    private readonly string? _clientId;
    private readonly string? _clientSecret;

    // awork OAuth endpoints
    private const string AworkAuthUrl = "https://api.awork.com/api/v1/accounts/authorize";
    private const string AworkTokenUrl = "https://api.awork.com/api/v1/accounts/token";
    private const string AworkUserInfoUrl = "https://api.awork.com/api/v1/me";
    private const string AworkDcrUrl = "https://api.awork.com/api/v1/clients";

    // In-memory storage for PKCE state (in production, use Redis or DB)
    private static readonly Dictionary<string, PkceState> _pkceStates = new();

    // DCR client credentials (cached per workspace)
    private static readonly Dictionary<string, ClientCredentials> _clientCredentials = new();

    public AuthService(HttpClient httpClient, DbContextFactory dbFactory, JwtService jwtService, string redirectUri, string? clientId = null, string? clientSecret = null)
    {
        _httpClient = httpClient;
        _dbFactory = dbFactory;
        _jwtService = jwtService;
        _redirectUri = redirectUri;
        _clientId = clientId;
        _clientSecret = clientSecret;
    }

    /// <summary>
    /// Generates a PKCE code verifier (43-128 characters, URL-safe)
    /// </summary>
    public static string GenerateCodeVerifier()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Base64UrlEncode(bytes);
    }

    /// <summary>
    /// Generates PKCE code challenge from verifier using SHA256
    /// </summary>
    public static string GenerateCodeChallenge(string codeVerifier)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(codeVerifier));
        return Base64UrlEncode(bytes);
    }

    /// <summary>
    /// Base64 URL encoding (RFC 7636)
    /// </summary>
    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    /// <summary>
    /// Generates a random state parameter for CSRF protection
    /// </summary>
    public static string GenerateState()
    {
        var bytes = new byte[16];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Base64UrlEncode(bytes);
    }

    /// <summary>
    /// Initiates the OAuth flow - returns the authorization URL
    /// </summary>
    public async Task<AuthInitResult> InitiateAuthAsync()
    {
        // Generate PKCE values
        var codeVerifier = GenerateCodeVerifier();
        var codeChallenge = GenerateCodeChallenge(codeVerifier);
        var state = GenerateState();

        // Store PKCE state for callback verification
        _pkceStates[state] = new PkceState
        {
            CodeVerifier = codeVerifier,
            CreatedAt = DateTime.UtcNow
        };

        // Clean up old states (older than 10 minutes)
        CleanupOldStates();

        // For DCR, we need to get client credentials first
        // If we don't have them cached, we'll use a temporary client
        // The user will need to authorize, and we'll register the client on callback

        // Build authorization URL with PKCE
        var authUrl = BuildAuthorizationUrl(codeChallenge, state);

        return new AuthInitResult
        {
            AuthorizationUrl = authUrl,
            State = state
        };
    }

    private string BuildAuthorizationUrl(string codeChallenge, string state)
    {
        // awork uses standard OAuth 2.0 with PKCE
        var queryParams = new Dictionary<string, string>
        {
            ["response_type"] = "code",
            ["redirect_uri"] = _redirectUri,
            ["state"] = state,
            ["code_challenge"] = codeChallenge,
            ["code_challenge_method"] = "S256",
            ["scope"] = "offline_access"  // Request refresh token
        };

        // Add client_id if configured
        if (!string.IsNullOrEmpty(_clientId))
        {
            queryParams["client_id"] = _clientId;
        }

        var queryString = string.Join("&", queryParams.Select(kvp =>
            $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value)}"));

        return $"{AworkAuthUrl}?{queryString}";
    }

    /// <summary>
    /// Handles the OAuth callback - exchanges code for tokens and creates/updates user
    /// </summary>
    public async Task<AuthCallbackResult> HandleCallbackAsync(string code, string state)
    {
        // Verify state and get PKCE verifier
        if (!_pkceStates.TryGetValue(state, out var pkceState))
        {
            return new AuthCallbackResult { Success = false, Error = "Invalid state parameter" };
        }

        // Remove used state
        _pkceStates.Remove(state);

        // Check if state is expired (10 minutes)
        if (DateTime.UtcNow - pkceState.CreatedAt > TimeSpan.FromMinutes(10))
        {
            return new AuthCallbackResult { Success = false, Error = "State expired" };
        }

        try
        {
            // Exchange authorization code for tokens
            var tokenResult = await ExchangeCodeForTokensAsync(code, pkceState.CodeVerifier);
            if (!tokenResult.Success)
            {
                return new AuthCallbackResult { Success = false, Error = tokenResult.Error };
            }

            // Get user info from awork
            var userInfo = await GetUserInfoAsync(tokenResult.AccessToken!);
            if (userInfo == null)
            {
                return new AuthCallbackResult { Success = false, Error = "Failed to get user info" };
            }

            // Store or update user in database
            var user = await SaveUserAsync(userInfo, tokenResult);

            // Generate JWT session token
            var sessionToken = _jwtService.GenerateToken(user.Id, user.AworkUserId, user.AworkWorkspaceId);

            return new AuthCallbackResult
            {
                Success = true,
                SessionToken = sessionToken,
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    AvatarUrl = user.AvatarUrl,
                    WorkspaceId = user.AworkWorkspaceId
                }
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Auth callback error: {ex.Message}");
            return new AuthCallbackResult { Success = false, Error = "Authentication failed" };
        }
    }

    private async Task<TokenResult> ExchangeCodeForTokensAsync(string code, string codeVerifier)
    {
        var requestBody = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = _redirectUri,
            ["code_verifier"] = codeVerifier
        };

        // Add client credentials if configured
        if (!string.IsNullOrEmpty(_clientId))
        {
            requestBody["client_id"] = _clientId;
        }
        if (!string.IsNullOrEmpty(_clientSecret))
        {
            requestBody["client_secret"] = _clientSecret;
        }

        var content = new FormUrlEncodedContent(requestBody);
        var response = await _httpClient.PostAsync(AworkTokenUrl, content);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"Token exchange failed: {response.StatusCode} - {errorBody}");
            return new TokenResult { Success = false, Error = "Token exchange failed" };
        }

        var json = await response.Content.ReadAsStringAsync();
        var tokenResponse = JsonSerializer.Deserialize<AworkTokenResponse>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (tokenResponse == null)
        {
            return new TokenResult { Success = false, Error = "Invalid token response" };
        }

        return new TokenResult
        {
            Success = true,
            AccessToken = tokenResponse.AccessToken,
            RefreshToken = tokenResponse.RefreshToken,
            ExpiresIn = tokenResponse.ExpiresIn
        };
    }

    private async Task<AworkUserInfo?> GetUserInfoAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, AworkUserInfoUrl);
        request.Headers.Add("Authorization", $"Bearer {accessToken}");

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"Get user info failed: {response.StatusCode}");
            return null;
        }

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<AworkUserInfo>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    private async Task<User> SaveUserAsync(AworkUserInfo userInfo, TokenResult tokenResult)
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();

        // Check if user exists
        cmd.CommandText = "SELECT Id, Email, Name, AvatarUrl FROM Users WHERE AworkUserId = @aworkUserId";
        cmd.Parameters.AddWithValue("@aworkUserId", userInfo.Id);

        User user;
        using (var reader = cmd.ExecuteReader())
        {
            if (reader.Read())
            {
                user = new User
                {
                    Id = reader.GetInt32(0),
                    AworkUserId = userInfo.Id,
                    AworkWorkspaceId = userInfo.WorkspaceId ?? "",
                    Email = reader.GetString(1),
                    Name = reader.GetString(2),
                    AvatarUrl = reader.IsDBNull(3) ? null : reader.GetString(3)
                };
            }
            else
            {
                user = new User
                {
                    AworkUserId = userInfo.Id,
                    AworkWorkspaceId = userInfo.WorkspaceId ?? "",
                    Email = userInfo.Email ?? "",
                    Name = $"{userInfo.FirstName} {userInfo.LastName}".Trim(),
                    AvatarUrl = userInfo.ProfileImage
                };
            }
        }

        // Upsert user
        cmd.CommandText = @"
            INSERT INTO Users (AworkUserId, AworkWorkspaceId, Email, Name, AvatarUrl, AccessToken, RefreshToken, TokenExpiresAt, CreatedAt, UpdatedAt)
            VALUES (@aworkUserId, @workspaceId, @email, @name, @avatar, @accessToken, @refreshToken, @tokenExpires, @now, @now)
            ON CONFLICT(AworkUserId) DO UPDATE SET
                AworkWorkspaceId = @workspaceId,
                Email = @email,
                Name = @name,
                AvatarUrl = @avatar,
                AccessToken = @accessToken,
                RefreshToken = @refreshToken,
                TokenExpiresAt = @tokenExpires,
                UpdatedAt = @now
            RETURNING Id";

        cmd.Parameters.Clear();
        cmd.Parameters.AddWithValue("@aworkUserId", user.AworkUserId);
        cmd.Parameters.AddWithValue("@workspaceId", user.AworkWorkspaceId);
        cmd.Parameters.AddWithValue("@email", user.Email);
        cmd.Parameters.AddWithValue("@name", user.Name);
        cmd.Parameters.AddWithValue("@avatar", (object?)user.AvatarUrl ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@accessToken", tokenResult.AccessToken!);
        cmd.Parameters.AddWithValue("@refreshToken", (object?)tokenResult.RefreshToken ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@tokenExpires", DateTime.UtcNow.AddSeconds(tokenResult.ExpiresIn));
        cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);

        user.Id = Convert.ToInt32(cmd.ExecuteScalar());

        return user;
    }

    /// <summary>
    /// Refreshes an expired access token
    /// </summary>
    public async Task<TokenResult> RefreshTokenAsync(string refreshToken)
    {
        var requestBody = new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = refreshToken
        };

        // Add client credentials if configured
        if (!string.IsNullOrEmpty(_clientId))
        {
            requestBody["client_id"] = _clientId;
        }
        if (!string.IsNullOrEmpty(_clientSecret))
        {
            requestBody["client_secret"] = _clientSecret;
        }

        var content = new FormUrlEncodedContent(requestBody);
        var response = await _httpClient.PostAsync(AworkTokenUrl, content);

        if (!response.IsSuccessStatusCode)
        {
            return new TokenResult { Success = false, Error = "Token refresh failed" };
        }

        var json = await response.Content.ReadAsStringAsync();
        var tokenResponse = JsonSerializer.Deserialize<AworkTokenResponse>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (tokenResponse == null)
        {
            return new TokenResult { Success = false, Error = "Invalid token response" };
        }

        return new TokenResult
        {
            Success = true,
            AccessToken = tokenResponse.AccessToken,
            RefreshToken = tokenResponse.RefreshToken,
            ExpiresIn = tokenResponse.ExpiresIn
        };
    }

    /// <summary>
    /// Gets user by ID from database
    /// </summary>
    public User? GetUserById(int userId)
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();

        cmd.CommandText = @"
            SELECT Id, AworkUserId, AworkWorkspaceId, Email, Name, AvatarUrl,
                   AccessToken, RefreshToken, TokenExpiresAt, CreatedAt, UpdatedAt
            FROM Users WHERE Id = @id";
        cmd.Parameters.AddWithValue("@id", userId);

        using var reader = cmd.ExecuteReader();
        if (!reader.Read()) return null;

        return new User
        {
            Id = reader.GetInt32(0),
            AworkUserId = reader.GetString(1),
            AworkWorkspaceId = reader.GetString(2),
            Email = reader.GetString(3),
            Name = reader.GetString(4),
            AvatarUrl = reader.IsDBNull(5) ? null : reader.GetString(5),
            AccessToken = reader.IsDBNull(6) ? null : reader.GetString(6),
            RefreshToken = reader.IsDBNull(7) ? null : reader.GetString(7),
            TokenExpiresAt = reader.IsDBNull(8) ? null : reader.GetDateTime(8),
            CreatedAt = reader.GetDateTime(9),
            UpdatedAt = reader.GetDateTime(10)
        };
    }

    private void CleanupOldStates()
    {
        var expiredStates = _pkceStates
            .Where(kvp => DateTime.UtcNow - kvp.Value.CreatedAt > TimeSpan.FromMinutes(10))
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var state in expiredStates)
        {
            _pkceStates.Remove(state);
        }
    }
}

// DTOs and helper classes
public class PkceState
{
    public required string CodeVerifier { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ClientCredentials
{
    public required string ClientId { get; set; }
    public required string ClientSecret { get; set; }
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

public class AworkTokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
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
