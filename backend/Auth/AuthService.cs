using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Collections.Concurrent;
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
    private readonly string _aworkAuthUrl;
    private readonly string _aworkTokenUrl;
    private readonly string _aworkUserInfoUrl;
    private readonly string _aworkPermissionsUrl;
    private readonly string _aworkDcrUrl;

    private const string DefaultAworkApiBaseUrl = "https://api.awork.com/api/v1";
    private const string WorkspaceManageConfigFeature = "workspace-manage-config";
    private static readonly string[] WorkspaceManageConfigAccessLevels = ["manage", "write", "config"];

    private const string DcrClientName = "awork Forms";
    private const string DcrScope = "offline_access full_access";
    private const string DcrApplicationType = "native";
    // Increment this to force DCR re-registration (e.g., after awork backend fixes)
    private const int DcrVersion = 3;

    private static string? _dcrClientId;
    private static readonly ConcurrentDictionary<Guid, SemaphoreSlim> RefreshLocks = new();

    public AuthService(
        HttpClient httpClient,
        IDbContextFactory<AppDbContext> dbFactory,
        JwtService jwtService,
        string redirectUri,
        string? aworkApiBaseUrl = null)
    {
        _httpClient = httpClient;
        _dbFactory = dbFactory;
        _jwtService = jwtService;
        _redirectUri = redirectUri;

        var baseUrl = string.IsNullOrWhiteSpace(aworkApiBaseUrl)
            ? DefaultAworkApiBaseUrl
            : aworkApiBaseUrl.TrimEnd('/');
        _aworkAuthUrl = $"{baseUrl}/accounts/authorize";
        _aworkTokenUrl = $"{baseUrl}/accounts/token";
        _aworkUserInfoUrl = $"{baseUrl}/me";
        _aworkPermissionsUrl = $"{baseUrl}/me/permissions";
        _aworkDcrUrl = $"{baseUrl}/clientapplications/register";
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

    /// <summary>
    /// Starts the awork OAuth flow and persists the PKCE state.
    /// </summary>
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

        var authUrl = $"{_aworkAuthUrl}?response_type=code&client_id={clientId}&redirect_uri={Uri.EscapeDataString(_redirectUri)}&scope={Uri.EscapeDataString(DcrScope)}&state={state}&code_challenge={codeChallenge}&code_challenge_method=S256";

        return new AuthInitResult { AuthorizationUrl = authUrl, State = state };
    }

    /// <summary>
    /// Completes the OAuth callback, upserts the user, and issues the Forms session token.
    /// </summary>
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

            var permissionSnapshot = await GetWorkspaceAccessPermissionSnapshot(tokenResult.AccessToken!);
            var user = await UpsertUser(userInfo, tokenResult, permissionSnapshot);
            var sessionToken = _jwtService.GenerateToken(user.Id, user.AworkUserId, user.AworkWorkspaceId);

            return new AuthCallbackResult
            {
                Success = true,
                SessionToken = sessionToken,
                User = user
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Auth callback error: {ex.Message}");
            return new AuthCallbackResult { Success = false, Error = "Authentication failed" };
        }
    }

    /// <summary>
    /// Clears the stored awork tokens for the given user.
    /// </summary>
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
        var scopeSetting = await db.Settings.FirstOrDefaultAsync(s => s.Key == "dcr_scope");
        var versionSetting = await db.Settings.FirstOrDefaultAsync(s => s.Key == "dcr_version");

        // Re-register if redirect URI, scope, or version changed
        var currentVersion = int.TryParse(versionSetting?.Value, out var v) ? v : 0;
        if (clientIdSetting != null && redirectUriSetting?.Value == _redirectUri && scopeSetting?.Value == DcrScope && currentVersion == DcrVersion)
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

        if (scopeSetting != null)
            scopeSetting.Value = DcrScope;
        else
            db.Settings.Add(new Setting { Key = "dcr_scope", Value = DcrScope });

        if (versionSetting != null)
            versionSetting.Value = DcrVersion.ToString();
        else
            db.Settings.Add(new Setting { Key = "dcr_version", Value = DcrVersion.ToString() });

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
            token_endpoint_auth_method = "none",
            grant_types = new[] { "authorization_code", "refresh_token" }
        };

        var requestJson = JsonSerializer.Serialize(dcrRequest);
        Console.WriteLine($"[DCR] Registering client with request: {requestJson}");

        var content = new StringContent(requestJson, Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync(_aworkDcrUrl, content);

        var responseJson = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"[DCR] Response status: {response.StatusCode}, body: {responseJson}");

        response.EnsureSuccessStatusCode();
        return JsonSerializer.Deserialize<DcrResponse>(responseJson) ?? throw new Exception("Failed to parse DCR response");
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

        var response = await _httpClient.PostAsync(_aworkTokenUrl, new FormUrlEncodedContent(tokenRequest));
        var json = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"[TOKEN] Response: {json}");

        if (!response.IsSuccessStatusCode)
            return new TokenResult { Success = false, Error = $"Token exchange failed: {json}" };

        var tokenResponse = JsonSerializer.Deserialize<AuthTokenResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Console.WriteLine($"[TOKEN] Parsed - AccessToken: {(string.IsNullOrEmpty(tokenResponse?.AccessToken) ? "NULL" : "present")}, RefreshToken: {(string.IsNullOrEmpty(tokenResponse?.RefreshToken) ? "NULL" : "present")}");

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
        var request = new HttpRequestMessage(HttpMethod.Get, _aworkUserInfoUrl);
        request.Headers.Add("Authorization", $"Bearer {accessToken}");

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return null;

        var json = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"[DEBUG] awork /me response: {json}");
        var userInfo = JsonSerializer.Deserialize<AworkUserInfo>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Console.WriteLine($"[DEBUG] Parsed workspace: Name={userInfo?.Workspace?.Name}, Url={userInfo?.Workspace?.Url}");
        return userInfo;
    }

    private async Task<WorkspaceAccessPermissionSnapshot> GetWorkspaceAccessPermissionSnapshot(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, _aworkPermissionsUrl);
        request.Headers.Add("Authorization", $"Bearer {accessToken}");

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return new WorkspaceAccessPermissionSnapshot();

        var json = await response.Content.ReadAsStringAsync();
        var permissions = JsonSerializer.Deserialize<AworkPermissionInfoResponse>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        var canManageWorkspaceAccess = permissions?.UserPermission?.Permissions?.Any(permission =>
            string.Equals(permission.Feature, WorkspaceManageConfigFeature, StringComparison.OrdinalIgnoreCase) &&
            permission.AccessLevels?.Any(level =>
                WorkspaceManageConfigAccessLevels.Contains(level, StringComparer.OrdinalIgnoreCase)) == true) == true;

        return new WorkspaceAccessPermissionSnapshot
        {
            IsAdmin = permissions?.UserPermission?.IsAdmin == true,
            CanManageWorkspaceAccess = canManageWorkspaceAccess
        };
    }

    private async Task<User> UpsertUser(AworkUserInfo userInfo, TokenResult tokenResult, WorkspaceAccessPermissionSnapshot permissionSnapshot)
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
                IsAworkAdmin = permissionSnapshot.IsAdmin,
                CanManageWorkspaceAccess = permissionSnapshot.CanManageWorkspaceAccess,
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
            user.IsAworkAdmin = permissionSnapshot.IsAdmin;
            user.CanManageWorkspaceAccess = permissionSnapshot.CanManageWorkspaceAccess;
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

    /// <summary>
    /// Returns the stored local user by Forms user id.
    /// </summary>
    public async Task<User?> GetUserById(Guid userId)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        return await db.Users.FindAsync(userId);
    }

    /// <summary>
    /// Refreshes the stored admin and manage-config flags from awork.
    /// </summary>
    public async Task RefreshWorkspaceAccessPermission(Guid userId)
    {
        try
        {
            var accessToken = await GetValidAccessToken(userId);
            if (string.IsNullOrEmpty(accessToken))
                return;

            var permissionSnapshot = await GetWorkspaceAccessPermissionSnapshot(accessToken);

            await using var db = await _dbFactory.CreateDbContextAsync();
            var user = await db.Users.FindAsync(userId);
            if (user == null ||
                (user.CanManageWorkspaceAccess == permissionSnapshot.CanManageWorkspaceAccess &&
                 user.IsAworkAdmin == permissionSnapshot.IsAdmin))
                return;

            user.IsAworkAdmin = permissionSnapshot.IsAdmin;
            user.CanManageWorkspaceAccess = permissionSnapshot.CanManageWorkspaceAccess;
            user.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to refresh workspace access permissions for user {userId}: {ex.Message}");
        }
    }

    /// <summary>
    /// Returns a usable awork access token, refreshing it when needed.
    /// </summary>
    public async Task<string?> GetValidAccessToken(Guid userId, bool forceRefresh = false)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var user = await db.Users.FindAsync(userId);

        if (user == null)
            return null;

        if (!forceRefresh && HasUsableAccessToken(user))
            return user.AccessToken;

        if (string.IsNullOrEmpty(user.RefreshToken))
            return null;

        var refreshLock = RefreshLocks.GetOrAdd(userId, static _ => new SemaphoreSlim(1, 1));
        await refreshLock.WaitAsync();
        try
        {
            await using var refreshDb = await _dbFactory.CreateDbContextAsync();
            var refreshUser = await refreshDb.Users.FindAsync(userId);
            if (refreshUser == null)
                return null;

            if (!forceRefresh && HasUsableAccessToken(refreshUser))
                return refreshUser.AccessToken;

            if (string.IsNullOrEmpty(refreshUser.RefreshToken))
                return null;

            var refreshed = await RefreshToken(refreshUser);
            return refreshed ? refreshUser.AccessToken : null;
        }
        finally
        {
            refreshLock.Release();
        }
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

        var response = await _httpClient.PostAsync(_aworkTokenUrl, new FormUrlEncodedContent(tokenRequest));
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

    private static bool HasUsableAccessToken(User user)
    {
        return !string.IsNullOrEmpty(user.AccessToken) &&
            user.TokenExpiresAt.HasValue &&
            user.TokenExpiresAt.Value > DateTime.UtcNow.AddMinutes(5);
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
