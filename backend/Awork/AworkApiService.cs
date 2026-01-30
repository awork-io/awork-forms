using System.Text.Json;
using Backend.Auth;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Awork;

public class AworkApiService
{
    private const string DefaultAworkApiBaseUrl = "https://api.awork.com/api/v1";

    private readonly HttpClient _httpClient;
    private readonly IDbContextFactory<AppDbContext> _dbFactory;
    private readonly string _baseUrl;

    public AworkApiService(HttpClient httpClient, IDbContextFactory<AppDbContext> dbFactory, string? baseUrl = null)
    {
        _httpClient = httpClient;
        _dbFactory = dbFactory;
        _baseUrl = string.IsNullOrWhiteSpace(baseUrl)
            ? DefaultAworkApiBaseUrl
            : baseUrl.TrimEnd('/');
    }

    public async Task<string?> GetValidAccessToken(Guid userId)
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

    public async Task<List<AworkProject>> GetProjects(Guid userId)
    {
        var result = await MakeAworkRequest<List<AworkProject>>(userId, "projects");
        return result ?? [];
    }

    public async Task<List<AworkProjectType>> GetProjectTypes(Guid userId)
    {
        var result = await MakeAworkRequest<List<AworkProjectType>>(userId, "projecttypes");
        return result ?? [];
    }

    public async Task<List<AworkUser>> GetUsers(Guid userId)
    {
        var result = await MakeAworkRequest<List<AworkUser>>(userId, "users");
        return result ?? [];
    }

    public async Task<List<AworkProjectStatus>> GetProjectStatuses(Guid userId, Guid projectTypeId)
    {
        var result = await MakeAworkRequest<List<AworkProjectStatus>>(userId, $"projecttypes/{projectTypeId}/projectstatuses");
        return result ?? [];
    }

    public async Task<List<AworkTaskStatus>> GetTaskStatuses(Guid userId, Guid projectId)
    {
        var result = await MakeAworkRequest<List<AworkTaskStatus>>(userId, $"projects/{projectId}/taskstatuses");
        return result ?? [];
    }

    public async Task<List<AworkTaskList>> GetTaskLists(Guid userId, Guid projectId)
    {
        var result = await MakeAworkRequest<List<AworkTaskList>>(userId, $"projects/{projectId}/tasklists");
        return result ?? [];
    }

    public async Task<List<AworkTypeOfWork>> GetTypesOfWork(Guid userId)
    {
        var result = await MakeAworkRequest<List<AworkTypeOfWork>>(userId, "typeofwork");
        return result ?? [];
    }

    public async Task<List<AworkCustomFieldDefinition>> GetProjectCustomFields(Guid userId, Guid projectId)
    {
        var result = await MakeAworkRequest<List<AworkCustomFieldDefinition>>(userId, $"projects/{projectId}/customfielddefinitions");
        return result ?? [];
    }

    public async Task<List<AworkCustomFieldDefinition>> GetTaskCustomFieldDefinitions(Guid userId)
    {
        var result = await MakeAworkRequest<List<AworkCustomFieldDefinition>>(userId, "customfielddefinitions?filterby=entity eq 'task'");
        return result ?? [];
    }

    public async Task<AworkCreateProjectResponse?> CreateProject(Guid userId, AworkCreateProjectRequest request)
    {
        return await MakeAworkPostRequest<AworkCreateProjectResponse>(userId, "projects", request);
    }

    public async Task<AworkCreateTaskResponse?> CreateTask(Guid userId, Guid projectId, AworkCreateTaskRequest request)
    {
        request.EntityId = projectId;
        request.BaseType = "projecttask";
        return await MakeAworkPostRequest<AworkCreateTaskResponse>(userId, "tasks", request);
    }

    public async Task<bool> LinkCustomFieldToProject(Guid userId, Guid projectId, Guid customFieldDefinitionId)
    {
        try
        {
            var body = new { customFieldDefinitionId, order = 1 };
            await MakeAworkPostRequest<object>(userId, $"projects/{projectId}/linkcustomfielddefinition", body);
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

    public async Task<bool> SetTaskCustomFields(Guid userId, Guid taskId, List<CustomFieldValue> customFields)
    {
        if (customFields.Count == 0) return true;

        try
        {
            await MakeAworkPostRequest<object>(userId, $"tasks/{taskId}/setcustomfields", customFields);
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to set custom fields on task {taskId}: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> AddTagsToTask(Guid userId, Guid taskId, List<string> tags)
    {
        if (tags.Count == 0) return true;

        try
        {
            var tagObjects = tags.Select(t => new { name = t.Trim(), color = (string?)null }).ToList();
            await MakeAworkPostRequest<object>(userId, $"tasks/{taskId}/addtags", tagObjects);
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to add tags to task {taskId}: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> AssignUserToTask(Guid userId, Guid taskId, Guid assigneeUserId)
    {
        try
        {
            var accessToken = await GetValidAccessToken(userId);
            if (string.IsNullOrEmpty(accessToken))
                return false;

            // awork API expects an array of user ID strings
            var body = new[] { assigneeUserId.ToString() };
            var jsonBody = JsonSerializer.Serialize(body);

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/tasks/{taskId}/setassignees");
            request.Headers.Add("Authorization", $"Bearer {accessToken}");
            request.Content = new StringContent(jsonBody, System.Text.Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to assign user {assigneeUserId} to task {taskId}: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> AttachFileToTask(Guid userId, Guid taskId, byte[] fileData, string fileName)
    {
        var accessToken = await GetValidAccessToken(userId);
        if (string.IsNullOrEmpty(accessToken))
            throw new UnauthorizedAccessException("No valid awork access token available.");

        try
        {
            using var form = new MultipartFormDataContent();
            using var fileContent = new ByteArrayContent(fileData);

            var mimeType = GetMimeType(fileName);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);
            form.Add(fileContent, "file", fileName);

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/tasks/{taskId}/files");
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

    public async Task<bool> TrackEvent(Guid userId, string eventName, Dictionary<string, object> data)
    {
        try
        {
            var payload = new
            {
                eventName,
                data,
                context = new
                {
                    userAgent = "awork-forms-backend/1.0",
                    locale = "en",
                    page = new
                    {
                        path = "/backend",
                        title = "awork Forms Backend",
                        url = "",
                        referrer = ""
                    }
                }
            };
            await MakeAworkPostRequest<object>(userId, "track", payload);
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to track event {eventName}: {ex.Message}");
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

    private async Task<T?> MakeAworkRequest<T>(Guid userId, string endpoint) where T : class
    {
        var accessToken = await GetValidAccessToken(userId);
        if (string.IsNullOrEmpty(accessToken))
            throw new UnauthorizedAccessException("No valid awork access token available. Please re-authenticate.");

        var request = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}/{endpoint}");
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

    private async Task<T?> MakeAworkPostRequest<T>(Guid userId, string endpoint, object body) where T : class
    {
        var accessToken = await GetValidAccessToken(userId);
        if (string.IsNullOrEmpty(accessToken))
            throw new UnauthorizedAccessException("No valid awork access token available. Please re-authenticate.");

        var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/{endpoint}");
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
