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

    // awork OAuth endpoints
    private const string AworkAuthUrl = "https://api.awork.com/api/v1/accounts/authorize";
    private const string AworkTokenUrl = "https://api.awork.com/api/v1/accounts/token";
    private const string AworkUserInfoUrl = "https://api.awork.com/api/v1/me";
    private const string AworkDcrUrl = "https://api.awork.com/api/v1/clientapplications/register";

    // DCR configuration
    private const string DcrClientName = "awork Forms";
    private const string DcrScope = "full_access offline_access";
    private const string DcrApplicationType = "native";
    private const string DcrSoftwareVersion = "1.0.0";

    // Settings keys
    private const string SettingsKeySoftwareId = "software_id";
    private const string SettingsKeyDcrClientId = "dcr_client_id";

    // In-memory storage for PKCE state (in production, use Redis or DB)
    private static readonly Dictionary<string, PkceState> _pkceStates = new();

    // DCR client ID (cached after first registration)
    private static string? _dcrClientId;

    public AuthService(HttpClient httpClient, DbContextFactory dbFactory, JwtService jwtService, string redirectUri)
    {
        _httpClient = httpClient;
        _dbFactory = dbFactory;
        _jwtService = jwtService;
        _redirectUri = redirectUri;
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
    /// Uses DCR (Dynamic Client Registration) to get a client_id first
    /// </summary>
    public async Task<AuthInitResult> InitiateAuthAsync()
    {
        // Step 1: Get or register DCR client
        var clientId = await GetOrRegisterDcrClientAsync();

        // Step 2: Generate PKCE values
        var codeVerifier = GenerateCodeVerifier();
        var codeChallenge = GenerateCodeChallenge(codeVerifier);
        var state = GenerateState();

        // Store PKCE state for callback verification (includes client_id)
        _pkceStates[state] = new PkceState
        {
            CodeVerifier = codeVerifier,
            ClientId = clientId,
            CreatedAt = DateTime.UtcNow
        };
        Console.WriteLine($"PKCE: Stored state {state}, total states: {_pkceStates.Count}");

        // Clean up old states (older than 10 minutes)
        CleanupOldStates();

        // Build authorization URL with PKCE and client_id
        var authUrl = BuildAuthorizationUrl(clientId, codeChallenge, state);

        return new AuthInitResult
        {
            AuthorizationUrl = authUrl,
            State = state
        };
    }

    /// <summary>
    /// Register a new OAuth client using DCR (RFC 7591) or return cached client_id
    /// </summary>
    private async Task<string> GetOrRegisterDcrClientAsync()
    {
        // Return cached client_id if available
        if (!string.IsNullOrEmpty(_dcrClientId))
        {
            return _dcrClientId;
        }

        // Try to load from database
        var storedClientId = LoadDcrClientId();
        if (!string.IsNullOrEmpty(storedClientId))
        {
            _dcrClientId = storedClientId;
            return storedClientId;
        }

        // Generate a unique software_id for this installation
        var softwareId = GetOrCreateSoftwareId();

        var registrationPayload = new Dictionary<string, object>
        {
            ["redirect_uris"] = new[] { _redirectUri },
            ["client_name"] = DcrClientName,
            ["token_endpoint_auth_method"] = "none", // Public client (no secret needed with PKCE)
            ["grant_types"] = new[] { "authorization_code", "refresh_token" },
            ["response_types"] = new[] { "code" },
            ["application_type"] = DcrApplicationType,
            ["software_id"] = softwareId,
            ["software_version"] = DcrSoftwareVersion
        };

        // Only add scope if specified
        if (!string.IsNullOrEmpty(DcrScope))
        {
            registrationPayload["scope"] = DcrScope;
        }

        var content = new StringContent(
            JsonSerializer.Serialize(registrationPayload),
            Encoding.UTF8,
            "application/json"
        );

        Console.WriteLine($"DCR: Registering client with software_id: {softwareId}");

        var response = await _httpClient.PostAsync(AworkDcrUrl, content);
        var responseBody = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"DCR response: {responseBody}");

        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"DCR registration failed: {response.StatusCode} - {responseBody}");
            throw new InvalidOperationException($"Failed to register OAuth client: {responseBody}");
        }

        var result = JsonSerializer.Deserialize<DcrResponse>(responseBody, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (result == null || string.IsNullOrEmpty(result.ClientId))
        {
            throw new InvalidOperationException("DCR response missing client_id");
        }

        Console.WriteLine($"DCR: Successfully registered client_id: {result.ClientId}, scope: {result.Scope}");

        // Cache and persist the client_id
        _dcrClientId = result.ClientId;
        StoreDcrClientId(result.ClientId);

        return result.ClientId;
    }

    /// <summary>
    /// Store the DCR client_id in the database for token refresh
    /// </summary>
    private void StoreDcrClientId(string clientId)
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();

        cmd.CommandText = @"
            INSERT OR REPLACE INTO Settings (Key, Value) VALUES (@key, @clientId)";
        cmd.Parameters.AddWithValue("@key", SettingsKeyDcrClientId);
        cmd.Parameters.AddWithValue("@clientId", clientId);
        cmd.ExecuteNonQuery();
    }

    /// <summary>
    /// Load the DCR client_id from the database
    /// </summary>
    private string? LoadDcrClientId()
    {
        try
        {
            using var ctx = _dbFactory.CreateContext();
            using var cmd = ctx.Connection.CreateCommand();
            cmd.CommandText = "SELECT Value FROM Settings WHERE Key = @key";
            cmd.Parameters.AddWithValue("@key", SettingsKeyDcrClientId);
            return cmd.ExecuteScalar()?.ToString();
        }
        catch
        {
            // Settings table might not exist yet
            return null;
        }
    }

    /// <summary>
    /// Get or create a unique software ID for this installation (stored in DB)
    /// </summary>
    private string GetOrCreateSoftwareId()
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();

        // Try to get existing software_id from a settings table or create one
        cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS Settings (Key TEXT PRIMARY KEY, Value TEXT);
            INSERT OR IGNORE INTO Settings (Key, Value) VALUES (@key, @newId);
            SELECT Value FROM Settings WHERE Key = @key;";
        cmd.Parameters.AddWithValue("@key", SettingsKeySoftwareId);
        cmd.Parameters.AddWithValue("@newId", Guid.NewGuid().ToString());

        var result = cmd.ExecuteScalar();
        return result?.ToString() ?? Guid.NewGuid().ToString();
    }

    private string BuildAuthorizationUrl(string clientId, string codeChallenge, string state)
    {
        // awork uses standard OAuth 2.0 with PKCE
        var queryParams = new Dictionary<string, string>
        {
            ["response_type"] = "code",
            ["client_id"] = clientId,
            ["redirect_uri"] = _redirectUri,
            ["state"] = state,
            ["code_challenge"] = codeChallenge,
            ["code_challenge_method"] = "S256"
        };

        // Only add scope if specified
        if (!string.IsNullOrEmpty(DcrScope))
        {
            queryParams["scope"] = DcrScope;
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
        Console.WriteLine($"PKCE: Looking for state {state}, available states: {string.Join(", ", _pkceStates.Keys)}");
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
            // Exchange authorization code for tokens (using client_id from PKCE state)
            var tokenResult = await ExchangeCodeForTokensAsync(code, pkceState.CodeVerifier, pkceState.ClientId);
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

    private async Task<TokenResult> ExchangeCodeForTokensAsync(string code, string codeVerifier, string clientId)
    {
        // For public clients with PKCE, we don't need client_secret
        var requestBody = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["client_id"] = clientId,
            ["redirect_uri"] = _redirectUri,
            ["code_verifier"] = codeVerifier
        };

        var content = new FormUrlEncodedContent(requestBody);
        var response = await _httpClient.PostAsync(AworkTokenUrl, content);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"Token exchange failed: {response.StatusCode} - {json}");
            return new TokenResult { Success = false, Error = "Token exchange failed" };
        }

        Console.WriteLine($"Token response: {json}");
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
            ON CONFLICT(AworkUserId, AworkWorkspaceId) DO UPDATE SET
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
        // Get the DCR client_id for public client token refresh
        var clientId = LoadDcrClientId();

        var requestBody = new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = refreshToken
        };

        // Public clients with PKCE need client_id but no secret
        if (!string.IsNullOrEmpty(clientId))
        {
            requestBody["client_id"] = clientId;
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
    public required string ClientId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DcrResponse
{
    [System.Text.Json.Serialization.JsonPropertyName("client_id")]
    public string ClientId { get; set; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("client_secret")]
    public string? ClientSecret { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("scope")]
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

public class AworkTokenResponse
{
    [System.Text.Json.Serialization.JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("refresh_token")]
    public string? RefreshToken { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("expires_in")]
    public int ExpiresIn { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("token_type")]
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
