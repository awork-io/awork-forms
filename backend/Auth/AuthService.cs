using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Backend.Data;
using Backend.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Auth;

public class AuthService
{
    private readonly HttpClient _httpClient;
    private readonly IDbContextFactory<AppDbContext> _dbFactory;
    private readonly JwtService _jwtService;
    private readonly string _redirectUri;

    private const string AworkAuthUrl = "https://api.awork.com/api/v1/accounts/authorize";
    private const string AworkTokenUrl = "https://api.awork.com/api/v1/accounts/token";
    private const string AworkUserInfoUrl = "https://api.awork.com/api/v1/me";
    private const string AworkDcrUrl = "https://api.awork.com/api/v1/clientapplications/register";

    private const string DcrClientName = "awork Forms";
    private const string DcrScope = "full_access";
    private const string DcrApplicationType = "native";

    private static string? _dcrClientId;

    public AuthService(HttpClient httpClient, IDbContextFactory<AppDbContext> dbFactory, JwtService jwtService, string redirectUri)
    {
        _httpClient = httpClient;
        _dbFactory = dbFactory;
        _jwtService = jwtService;
        _redirectUri = redirectUri;
    }

    public static string GenerateCodeVerifier()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Base64UrlEncode(bytes);
    }

    public static string GenerateCodeChallenge(string codeVerifier)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(codeVerifier));
        return Base64UrlEncode(bytes);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public static string GenerateState()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Base64UrlEncode(bytes);
    }

    public async Task<AuthInitResult> InitiateAuth()
    {
        var clientId = await GetOrCreateDcrClientId();
        var codeVerifier = GenerateCodeVerifier();
        var codeChallenge = GenerateCodeChallenge(codeVerifier);
        var state = GenerateState();

        await using (var db = await _dbFactory.CreateDbContextAsync())
        {
            db.OAuthStates.Add(new OAuthState
            {
                State = state,
                CodeVerifier = codeVerifier,
                ClientId = clientId,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        await CleanupExpiredStates();

        var authUrl = $"{AworkAuthUrl}?response_type=code&client_id={clientId}&redirect_uri={Uri.EscapeDataString(_redirectUri)}&scope={Uri.EscapeDataString(DcrScope)}&state={state}&code_challenge={codeChallenge}&code_challenge_method=S256";

        return new AuthInitResult { AuthorizationUrl = authUrl, State = state };
    }

    public async Task<AuthCallbackResult> HandleCallback(string code, string state)
    {
        OAuthState? pkceState;
        await using (var db = await _dbFactory.CreateDbContextAsync())
        {
            pkceState = await db.OAuthStates.FirstOrDefaultAsync(s => s.State == state);
            if (pkceState == null)
                return new AuthCallbackResult { Success = false, Error = "Invalid state parameter" };

            if (DateTime.UtcNow - pkceState.CreatedAt > TimeSpan.FromMinutes(10))
            {
                db.OAuthStates.Remove(pkceState);
                await db.SaveChangesAsync();
                return new AuthCallbackResult { Success = false, Error = "State expired" };
            }

            db.OAuthStates.Remove(pkceState);
            await db.SaveChangesAsync();
        }

        try
        {
            var tokenResult = await ExchangeCodeForTokens(code, pkceState.CodeVerifier, pkceState.ClientId);
            if (!tokenResult.Success)
                return new AuthCallbackResult { Success = false, Error = tokenResult.Error };

            var userInfo = await GetUserInfo(tokenResult.AccessToken!);
            if (userInfo == null)
                return new AuthCallbackResult { Success = false, Error = "Failed to get user info" };

            var user = await UpsertUser(userInfo, tokenResult);
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
                    WorkspaceId = user.AworkWorkspaceId,
                    WorkspaceName = user.WorkspaceName,
                    WorkspaceUrl = user.WorkspaceUrl
                }
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Auth callback error: {ex.Message}");
            return new AuthCallbackResult { Success = false, Error = "Authentication failed" };
        }
    }

    public async Task ClearUserTokens(Guid userId)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return;

        user.AccessToken = null;
        user.RefreshToken = null;
        user.TokenExpiresAt = null;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
    }

    private async Task<string> GetOrCreateDcrClientId()
    {
        if (!string.IsNullOrEmpty(_dcrClientId))
            return _dcrClientId;

        await using var db = await _dbFactory.CreateDbContextAsync();
        var clientIdSetting = await db.Settings.FirstOrDefaultAsync(s => s.Key == "dcr_client_id");
        var redirectUriSetting = await db.Settings.FirstOrDefaultAsync(s => s.Key == "dcr_redirect_uri");

        // Re-register if redirect URI changed
        if (clientIdSetting != null && redirectUriSetting?.Value == _redirectUri)
        {
            _dcrClientId = clientIdSetting.Value;
            return _dcrClientId;
        }

        // Register new client
        var dcrResponse = await RegisterDcrClient();
        _dcrClientId = dcrResponse.ClientId;

        // Update or create settings
        if (clientIdSetting != null)
            clientIdSetting.Value = _dcrClientId;
        else
            db.Settings.Add(new Setting { Key = "dcr_client_id", Value = _dcrClientId });

        if (redirectUriSetting != null)
            redirectUriSetting.Value = _redirectUri;
        else
            db.Settings.Add(new Setting { Key = "dcr_redirect_uri", Value = _redirectUri });

        await db.SaveChangesAsync();

        return _dcrClientId;
    }

    private async Task<DcrResponse> RegisterDcrClient()
    {
        var dcrRequest = new
        {
            client_name = DcrClientName,
            redirect_uris = new[] { _redirectUri },
            scope = DcrScope,
            application_type = DcrApplicationType,
            token_endpoint_auth_method = "none"
        };

        var content = new StringContent(JsonSerializer.Serialize(dcrRequest), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync(AworkDcrUrl, content);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<DcrResponse>(json) ?? throw new Exception("Failed to parse DCR response");
    }

    private async Task<TokenResult> ExchangeCodeForTokens(string code, string codeVerifier, string clientId)
    {
        var tokenRequest = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = _redirectUri,
            ["client_id"] = clientId,
            ["code_verifier"] = codeVerifier
        };

        var response = await _httpClient.PostAsync(AworkTokenUrl, new FormUrlEncodedContent(tokenRequest));
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            return new TokenResult { Success = false, Error = $"Token exchange failed: {json}" };

        var tokenResponse = JsonSerializer.Deserialize<AuthTokenResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
            return new TokenResult { Success = false, Error = "Invalid token response" };

        return new TokenResult
        {
            Success = true,
            AccessToken = tokenResponse.AccessToken,
            RefreshToken = tokenResponse.RefreshToken,
            ExpiresIn = tokenResponse.ExpiresIn
        };
    }

    private async Task<AworkUserInfo?> GetUserInfo(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, AworkUserInfoUrl);
        request.Headers.Add("Authorization", $"Bearer {accessToken}");

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return null;

        var json = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"[DEBUG] awork /me response: {json}");
        var userInfo = JsonSerializer.Deserialize<AworkUserInfo>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Console.WriteLine($"[DEBUG] Parsed workspace: Name={userInfo?.Workspace?.Name}, Url={userInfo?.Workspace?.Url}");
        return userInfo;
    }

    private async Task<User> UpsertUser(AworkUserInfo userInfo, TokenResult tokenResult)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();

        var workspaceId = userInfo.Workspace?.Id ?? userInfo.WorkspaceId ?? userInfo.AccountId ?? Guid.Empty;
        if (workspaceId == Guid.Empty)
            throw new Exception("Missing workspace ID in awork user info");

        var user = await db.Users.FirstOrDefaultAsync(u =>
            u.AworkUserId == userInfo.Id && u.AworkWorkspaceId == workspaceId);

        var now = DateTime.UtcNow;

        if (user == null)
        {
            user = new User
            {
                AworkUserId = userInfo.Id,
                AworkWorkspaceId = workspaceId,
                WorkspaceName = userInfo.Workspace?.Name,
                WorkspaceUrl = userInfo.Workspace?.Url,
                Email = userInfo.Email ?? "",
                Name = $"{userInfo.FirstName} {userInfo.LastName}".Trim(),
                AvatarUrl = userInfo.ProfileImage,
                AccessToken = tokenResult.AccessToken,
                RefreshToken = tokenResult.RefreshToken,
                TokenExpiresAt = now.AddSeconds(tokenResult.ExpiresIn),
                CreatedAt = now,
                UpdatedAt = now
            };
            if (user.Id == Guid.Empty)
                user.Id = Guid.NewGuid();
            db.Users.Add(user);
        }
        else
        {
            user.Email = userInfo.Email ?? user.Email;
            user.Name = $"{userInfo.FirstName} {userInfo.LastName}".Trim();
            user.AvatarUrl = userInfo.ProfileImage;
            if (!string.IsNullOrWhiteSpace(userInfo.Workspace?.Name))
                user.WorkspaceName = userInfo.Workspace.Name;
            if (!string.IsNullOrWhiteSpace(userInfo.Workspace?.Url))
                user.WorkspaceUrl = userInfo.Workspace.Url;
            user.AccessToken = tokenResult.AccessToken;
            user.RefreshToken = tokenResult.RefreshToken;
            user.TokenExpiresAt = now.AddSeconds(tokenResult.ExpiresIn);
            user.UpdatedAt = now;
        }

        await db.SaveChangesAsync();
        return user;
    }

    public async Task<User?> GetUserById(Guid userId)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        return await db.Users.FindAsync(userId);
    }

    public async Task<string?> GetValidAccessToken(Guid userId)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var user = await db.Users.FindAsync(userId);

        if (user == null || string.IsNullOrEmpty(user.AccessToken))
            return null;

        if (user.TokenExpiresAt > DateTime.UtcNow.AddMinutes(5))
            return user.AccessToken;

        if (string.IsNullOrEmpty(user.RefreshToken))
            return null;

        var refreshed = await RefreshToken(user);
        return refreshed ? user.AccessToken : null;
    }

    private async Task<bool> RefreshToken(User user)
    {
        var clientId = await GetOrCreateDcrClientId();

        var tokenRequest = new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = user.RefreshToken!,
            ["client_id"] = clientId
        };

        var response = await _httpClient.PostAsync(AworkTokenUrl, new FormUrlEncodedContent(tokenRequest));
        if (!response.IsSuccessStatusCode) return false;

        var json = await response.Content.ReadAsStringAsync();
        var tokenResponse = JsonSerializer.Deserialize<AuthTokenResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
            return false;

        await using var db = await _dbFactory.CreateDbContextAsync();
        var dbUser = await db.Users.FindAsync(user.Id);
        if (dbUser == null) return false;

        dbUser.AccessToken = tokenResponse.AccessToken;
        dbUser.RefreshToken = tokenResponse.RefreshToken ?? dbUser.RefreshToken;
        dbUser.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
        dbUser.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        user.AccessToken = dbUser.AccessToken;
        user.RefreshToken = dbUser.RefreshToken;
        user.TokenExpiresAt = dbUser.TokenExpiresAt;

        return true;
    }

    private async Task CleanupExpiredStates()
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var cutoff = DateTime.UtcNow.AddMinutes(-15);
        var expired = await db.OAuthStates.Where(s => s.CreatedAt < cutoff).ToListAsync();
        if (expired.Count == 0) return;
        db.OAuthStates.RemoveRange(expired);
        await db.SaveChangesAsync();
    }
}
