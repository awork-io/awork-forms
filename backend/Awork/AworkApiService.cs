using System.Text.Json;
using Backend.Auth;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Awork;

public class AworkApiService
{
    private const string AworkApiBaseUrl = "https://api.awork.com/api/v1";

    private readonly HttpClient _httpClient;
    private readonly IDbContextFactory<AppDbContext> _dbFactory;

    public AworkApiService(HttpClient httpClient, IDbContextFactory<AppDbContext> dbFactory)
    {
        _httpClient = httpClient;
        _dbFactory = dbFactory;
    }

    public async Task<string?> GetValidAccessTokenAsync(int userId)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var user = await db.Users.FindAsync(userId);

        if (user == null || string.IsNullOrEmpty(user.AccessToken))
            return null;

        if (user.TokenExpiresAt > DateTime.UtcNow.AddMinutes(5))
            return user.AccessToken;

        // Token needs refresh - for now, require re-auth
        return null;
    }

    public async Task<List<AworkProject>> GetProjectsAsync(int userId)
    {
        var result = await MakeAworkRequestAsync<List<AworkProject>>(userId, "projects");
        return result ?? [];
    }

    public async Task<List<AworkProjectType>> GetProjectTypesAsync(int userId)
    {
        var result = await MakeAworkRequestAsync<List<AworkProjectType>>(userId, "projecttypes");
        return result ?? [];
    }

    public async Task<List<AworkUser>> GetUsersAsync(int userId)
    {
        var result = await MakeAworkRequestAsync<List<AworkUser>>(userId, "users");
        return result ?? [];
    }

    public async Task<List<AworkProjectStatus>> GetProjectStatusesAsync(int userId, string projectTypeId)
    {
        var result = await MakeAworkRequestAsync<List<AworkProjectStatus>>(userId, $"projecttypes/{projectTypeId}/projectstatuses");
        return result ?? [];
    }

    public async Task<List<AworkTaskStatus>> GetTaskStatusesAsync(int userId, string projectId)
    {
        var result = await MakeAworkRequestAsync<List<AworkTaskStatus>>(userId, $"projects/{projectId}/taskstatuses");
        return result ?? [];
    }

    public async Task<List<AworkTaskList>> GetTaskListsAsync(int userId, string projectId)
    {
        var result = await MakeAworkRequestAsync<List<AworkTaskList>>(userId, $"projects/{projectId}/tasklists");
        return result ?? [];
    }

    public async Task<List<AworkTypeOfWork>> GetTypesOfWorkAsync(int userId)
    {
        var result = await MakeAworkRequestAsync<List<AworkTypeOfWork>>(userId, "typeofwork");
        return result ?? [];
    }

    public async Task<List<AworkCustomFieldDefinition>> GetTaskCustomFieldsAsync(int userId)
    {
        var result = await MakeAworkRequestAsync<List<AworkCustomFieldDefinition>>(userId, "customfielddefinitions?filterby=entityType eq 'tasks'");
        return result ?? [];
    }

    public async Task<AworkCreateProjectResponse?> CreateProjectAsync(int userId, AworkCreateProjectRequest request)
    {
        return await MakeAworkPostRequestAsync<AworkCreateProjectResponse>(userId, "projects", request);
    }

    public async Task<AworkCreateTaskResponse?> CreateTaskAsync(int userId, string projectId, AworkCreateTaskRequest request)
    {
        request.EntityId = projectId;
        request.BaseType = "projecttask";
        return await MakeAworkPostRequestAsync<AworkCreateTaskResponse>(userId, "tasks", request);
    }

    public async Task<bool> LinkCustomFieldToProject(int userId, string projectId, string customFieldDefinitionId)
    {
        try
        {
            var body = new { customFieldDefinitionId, order = 1 };
            await MakeAworkPostRequestAsync<object>(userId, $"projects/{projectId}/linkcustomfielddefinition", body);
            return true;
        }
        catch (Exception ex)
        {
            // 409 Conflict means it's already linked - that's fine
            if (ex.Message.Contains("409") || ex.Message.Contains("Conflict"))
                return true;
            Console.WriteLine($"Failed to link custom field {customFieldDefinitionId} to project {projectId}: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> SetTaskCustomFields(int userId, string taskId, List<CustomFieldValue> customFields)
    {
        if (customFields.Count == 0) return true;

        try
        {
            await MakeAworkPostRequestAsync<object>(userId, $"tasks/{taskId}/setcustomfields", customFields);
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to set custom fields on task {taskId}: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> AddTagsToTask(int userId, string taskId, List<string> tags)
    {
        if (tags.Count == 0) return true;

        try
        {
            var tagObjects = tags.Select(t => new { name = t.Trim(), color = (string?)null }).ToList();
            await MakeAworkPostRequestAsync<object>(userId, $"tasks/{taskId}/addtags", tagObjects);
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to add tags to task {taskId}: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> AttachFileToTaskAsync(int userId, string taskId, string localFilePath, string fileName)
    {
        var accessToken = await GetValidAccessTokenAsync(userId);
        if (string.IsNullOrEmpty(accessToken))
            throw new UnauthorizedAccessException("No valid awork access token available.");

        try
        {
            using var form = new MultipartFormDataContent();
            using var fileStream = File.OpenRead(localFilePath);
            using var fileContent = new StreamContent(fileStream);

            var mimeType = GetMimeType(fileName);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);
            form.Add(fileContent, "file", fileName);

            var request = new HttpRequestMessage(HttpMethod.Post, $"{AworkApiBaseUrl}/tasks/{taskId}/files");
            request.Headers.Add("Authorization", $"Bearer {accessToken}");
            request.Content = form;

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Failed to attach file {fileName} to task {taskId}: {response.StatusCode} - {error}");
                return false;
            }
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to attach file {fileName} to task {taskId}: {ex.Message}");
            return false;
        }
    }

    private static string GetMimeType(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".pdf" => "application/pdf",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".txt" => "text/plain",
            ".csv" => "text/csv",
            ".zip" => "application/zip",
            _ => "application/octet-stream"
        };
    }

    private async Task<T?> MakeAworkRequestAsync<T>(int userId, string endpoint) where T : class
    {
        var accessToken = await GetValidAccessTokenAsync(userId);
        if (string.IsNullOrEmpty(accessToken))
            throw new UnauthorizedAccessException("No valid awork access token available. Please re-authenticate.");

        var request = new HttpRequestMessage(HttpMethod.Get, $"{AworkApiBaseUrl}/{endpoint}");
        request.Headers.Add("Authorization", $"Bearer {accessToken}");

        var response = await _httpClient.SendAsync(request);

        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            throw new UnauthorizedAccessException("awork API returned unauthorized. Please re-authenticate.");

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"awork API error: {response.StatusCode} - {errorBody}");
        }

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }

    private async Task<T?> MakeAworkPostRequestAsync<T>(int userId, string endpoint, object body) where T : class
    {
        var accessToken = await GetValidAccessTokenAsync(userId);
        if (string.IsNullOrEmpty(accessToken))
            throw new UnauthorizedAccessException("No valid awork access token available. Please re-authenticate.");

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
            throw new UnauthorizedAccessException("awork API returned unauthorized. Please re-authenticate.");

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"awork API error: {response.StatusCode} - {errorBody}");
        }

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }
}
