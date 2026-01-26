using System.Text.Json;
using Backend.Auth;
using Backend.Database;

namespace Backend.Awork;

public class AworkApiService
{
    private const string AworkApiBaseUrl = "https://api.awork.com/api/v1";
    private const string AworkTokenUrl = "https://api.awork.com/api/v1/accounts/token";
    private const string SettingsKeyDcrClientId = "dcr_client_id";

    private readonly HttpClient _httpClient;
    private readonly DbContextFactory _dbFactory;

    public AworkApiService(HttpClient httpClient, DbContextFactory dbFactory)
    {
        _httpClient = httpClient;
        _dbFactory = dbFactory;
    }

    /// <summary>
    /// Gets a valid access token for the user, refreshing if expired
    /// </summary>
    public async Task<string?> GetValidAccessTokenAsync(int userId)
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();

        cmd.CommandText = @"
            SELECT AccessToken, RefreshToken, TokenExpiresAt
            FROM Users WHERE Id = @id";
        cmd.Parameters.AddWithValue("@id", userId);

        string? accessToken = null;
        string? refreshToken = null;
        DateTime? tokenExpiresAt = null;

        using (var reader = cmd.ExecuteReader())
        {
            if (!reader.Read())
                return null;

            accessToken = reader.IsDBNull(0) ? null : reader.GetString(0);
            refreshToken = reader.IsDBNull(1) ? null : reader.GetString(1);
            tokenExpiresAt = reader.IsDBNull(2) ? null : reader.GetDateTime(2);
        }

        if (string.IsNullOrEmpty(accessToken))
            return null;

        // Check if token is expired (with 5-minute buffer)
        if (tokenExpiresAt.HasValue && DateTime.UtcNow.AddMinutes(5) >= tokenExpiresAt.Value)
        {
            // Token is expired or about to expire, refresh it
            if (string.IsNullOrEmpty(refreshToken))
            {
                Console.WriteLine("Token expired and no refresh token available");
                return null;
            }

            var newTokens = await RefreshAccessTokenAsync(refreshToken);
            if (newTokens == null)
            {
                Console.WriteLine("Failed to refresh access token");
                return null;
            }

            // Update tokens in database
            await UpdateUserTokensAsync(userId, newTokens.AccessToken!, newTokens.RefreshToken, newTokens.ExpiresIn);
            return newTokens.AccessToken;
        }

        return accessToken;
    }

    /// <summary>
    /// Gets the DCR client_id from the Settings table
    /// </summary>
    private string? GetDcrClientId()
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();
        cmd.CommandText = "SELECT Value FROM Settings WHERE Key = @key";
        cmd.Parameters.AddWithValue("@key", SettingsKeyDcrClientId);
        return cmd.ExecuteScalar()?.ToString();
    }

    /// <summary>
    /// Refreshes an expired access token
    /// </summary>
    private async Task<TokenRefreshResult?> RefreshAccessTokenAsync(string refreshToken)
    {
        // Get the DCR client_id (required for public client token refresh)
        var clientId = GetDcrClientId();

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
            var errorBody = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"Token refresh failed: {response.StatusCode} - {errorBody}");
            return null;
        }

        var json = await response.Content.ReadAsStringAsync();
        var tokenResponse = JsonSerializer.Deserialize<AworkTokenResponse>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (tokenResponse == null)
            return null;

        return new TokenRefreshResult
        {
            AccessToken = tokenResponse.AccessToken,
            RefreshToken = tokenResponse.RefreshToken,
            ExpiresIn = tokenResponse.ExpiresIn
        };
    }

    /// <summary>
    /// Updates user tokens in the database
    /// </summary>
    private async Task UpdateUserTokensAsync(int userId, string accessToken, string? refreshToken, int expiresIn)
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();

        cmd.CommandText = @"
            UPDATE Users
            SET AccessToken = @accessToken,
                RefreshToken = COALESCE(@refreshToken, RefreshToken),
                TokenExpiresAt = @tokenExpires,
                UpdatedAt = @now
            WHERE Id = @id";

        cmd.Parameters.AddWithValue("@id", userId);
        cmd.Parameters.AddWithValue("@accessToken", accessToken);
        cmd.Parameters.AddWithValue("@refreshToken", (object?)refreshToken ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@tokenExpires", DateTime.UtcNow.AddSeconds(expiresIn));
        cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);

        await Task.Run(() => cmd.ExecuteNonQuery());
    }

    /// <summary>
    /// Makes an authenticated request to the awork API
    /// </summary>
    private async Task<T?> MakeAworkRequestAsync<T>(int userId, string endpoint) where T : class
    {
        var accessToken = await GetValidAccessTokenAsync(userId);
        if (string.IsNullOrEmpty(accessToken))
        {
            throw new UnauthorizedAccessException("No valid awork access token available. Please re-authenticate.");
        }

        var request = new HttpRequestMessage(HttpMethod.Get, $"{AworkApiBaseUrl}/{endpoint}");
        request.Headers.Add("Authorization", $"Bearer {accessToken}");

        var response = await _httpClient.SendAsync(request);

        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            throw new UnauthorizedAccessException("awork API returned unauthorized. Please re-authenticate.");
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"awork API error for {endpoint}: {response.StatusCode} - {errorBody}");
            throw new HttpRequestException($"awork API error: {response.StatusCode}");
        }

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    /// <summary>
    /// Gets all projects from awork
    /// </summary>
    public async Task<List<AworkProject>> GetProjectsAsync(int userId)
    {
        var result = await MakeAworkRequestAsync<List<AworkProject>>(userId, "projects");
        return result ?? new List<AworkProject>();
    }

    /// <summary>
    /// Gets all project types from awork
    /// </summary>
    public async Task<List<AworkProjectType>> GetProjectTypesAsync(int userId)
    {
        var result = await MakeAworkRequestAsync<List<AworkProjectType>>(userId, "projecttypes");
        return result ?? new List<AworkProjectType>();
    }

    /// <summary>
    /// Gets all users from awork workspace
    /// </summary>
    public async Task<List<AworkUser>> GetUsersAsync(int userId)
    {
        var result = await MakeAworkRequestAsync<List<AworkUser>>(userId, "users");
        return result ?? new List<AworkUser>();
    }

    /// <summary>
    /// Gets project statuses for a specific project type
    /// </summary>
    public async Task<List<AworkProjectStatus>> GetProjectStatusesAsync(int userId, string projectTypeId)
    {
        var result = await MakeAworkRequestAsync<List<AworkProjectStatus>>(userId, $"projecttypes/{projectTypeId}/projectstatuses");
        return result ?? new List<AworkProjectStatus>();
    }

    /// <summary>
    /// Gets task statuses for a specific project
    /// </summary>
    public async Task<List<AworkTaskStatus>> GetTaskStatusesAsync(int userId, string projectId)
    {
        var result = await MakeAworkRequestAsync<List<AworkTaskStatus>>(userId, $"projects/{projectId}/taskstatuses");
        return result ?? new List<AworkTaskStatus>();
    }

    /// <summary>
    /// Gets task lists for a specific project
    /// </summary>
    public async Task<List<AworkTaskList>> GetTaskListsAsync(int userId, string projectId)
    {
        var result = await MakeAworkRequestAsync<List<AworkTaskList>>(userId, $"projects/{projectId}/tasklists");
        return result ?? new List<AworkTaskList>();
    }

    /// <summary>
    /// Gets all types of work from awork workspace
    /// </summary>
    public async Task<List<AworkTypeOfWork>> GetTypesOfWorkAsync(int userId)
    {
        var result = await MakeAworkRequestAsync<List<AworkTypeOfWork>>(userId, "typeofwork");
        return result ?? new List<AworkTypeOfWork>();
    }

    /// <summary>
    /// Creates a new project in awork
    /// </summary>
    public async Task<AworkCreateProjectResponse?> CreateProjectAsync(int userId, AworkCreateProjectRequest request)
    {
        return await MakeAworkPostRequestAsync<AworkCreateProjectResponse>(userId, "projects", request);
    }

    /// <summary>
    /// Creates a new task in awork
    /// </summary>
    public async Task<AworkCreateTaskResponse?> CreateTaskAsync(int userId, string projectId, AworkCreateTaskRequest request)
    {
        // Set the project ID and base type in the request
        request.EntityId = projectId;
        request.BaseType = "projecttask";
        return await MakeAworkPostRequestAsync<AworkCreateTaskResponse>(userId, "tasks", request);
    }

    /// <summary>
    /// Makes an authenticated POST request to the awork API
    /// </summary>
    private async Task<T?> MakeAworkPostRequestAsync<T>(int userId, string endpoint, object body) where T : class
    {
        var accessToken = await GetValidAccessTokenAsync(userId);
        if (string.IsNullOrEmpty(accessToken))
        {
            throw new UnauthorizedAccessException("No valid awork access token available. Please re-authenticate.");
        }

        var request = new HttpRequestMessage(HttpMethod.Post, $"{AworkApiBaseUrl}/{endpoint}");
        request.Headers.Add("Authorization", $"Bearer {accessToken}");

        var jsonBody = JsonSerializer.Serialize(body, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });
        request.Content = new StringContent(jsonBody, System.Text.Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request);

        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            throw new UnauthorizedAccessException("awork API returned unauthorized. Please re-authenticate.");
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"awork API error for POST {endpoint}: {response.StatusCode} - {errorBody}");
            throw new HttpRequestException($"awork API error: {response.StatusCode} - {errorBody}");
        }

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }
}

// DTOs for awork API responses
public class AworkProject
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ProjectTypeId { get; set; }
    public string? ProjectStatusId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsBillableByDefault { get; set; }
    public string? Color { get; set; }
}

public class AworkProjectType
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public bool IsPreset { get; set; }
}

public class AworkUser
{
    public string Id { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Position { get; set; }
    public string? ProfileImage { get; set; }
    public bool IsExternal { get; set; }
    public bool IsArchived { get; set; }
}

public class AworkProjectStatus
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // "progress", "done", "stuck"
    public int Order { get; set; }
}

public class AworkTaskStatus
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // "todo", "progress", "done", "review"
    public int Order { get; set; }
}

public class AworkTaskList
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
    public int OrderOfNewTasks { get; set; }
}

public class AworkTypeOfWork
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public bool IsArchived { get; set; }
}

public class AworkTokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
    public string TokenType { get; set; } = string.Empty;
}

public class TokenRefreshResult
{
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
}

// DTOs for creating projects
public class AworkCreateProjectRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ProjectTypeId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
}

public class AworkCreateProjectResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ProjectTypeId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
}

// DTOs for creating tasks
public class AworkCreateTaskRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? BaseType { get; set; }  // "projecttask" or "private"
    public string? EntityId { get; set; }  // Project ID for project tasks
    public bool IsPriority { get; set; }
    public DateTime? DueOn { get; set; }
    public DateTime? StartOn { get; set; }
    public int? PlannedDuration { get; set; }
    public string? TaskStatusId { get; set; }
    public string? TypeOfWorkId { get; set; }
    public string? ListId { get; set; }  // Task list ID (renamed from TaskListId)
    public List<AworkTaskAssignment>? Assignments { get; set; }
}

public class AworkTaskAssignment
{
    public string UserId { get; set; } = string.Empty;
}

public class AworkCreateTaskResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsPriority { get; set; }
    public DateTime? DueOn { get; set; }
    public DateTime? StartOn { get; set; }
    public int? PlannedDuration { get; set; }
    public string? TaskStatusId { get; set; }
    public string? ProjectId { get; set; }
}
