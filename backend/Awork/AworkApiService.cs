using System.Text.Json;
using Backend.Auth;

namespace Backend.Awork;

public class AworkApiService
{
    private const string DefaultAworkApiBaseUrl = "https://api.awork.com/api/v1";

    private readonly HttpClient _httpClient;
    private readonly AuthService _authService;
    private readonly string _baseUrl;

    public AworkApiService(HttpClient httpClient, AuthService authService, string? baseUrl = null)
    {
        _httpClient = httpClient;
        _authService = authService;
        _baseUrl = string.IsNullOrWhiteSpace(baseUrl)
            ? DefaultAworkApiBaseUrl
            : baseUrl.TrimEnd('/');
    }

    /// <summary>
    /// Returns a usable awork access token for the given Forms user.
    /// </summary>
    public Task<string?> GetValidAccessToken(Guid userId, bool forceRefresh = false) =>
        _authService.GetValidAccessToken(userId, forceRefresh);

    /// <summary>
    /// Fetches awork projects visible to the current user.
    /// </summary>
    public async Task<List<AworkProject>> GetProjects(Guid userId)
    {
        var result = await MakeAworkRequest<List<AworkProject>>(userId, "projects");
        return result ?? [];
    }

    /// <summary>
    /// Fetches awork project types visible to the current user.
    /// </summary>
    public async Task<List<AworkProjectType>> GetProjectTypes(Guid userId)
    {
        var result = await MakeAworkRequest<List<AworkProjectType>>(userId, "projecttypes");
        return result ?? [];
    }

    /// <summary>
    /// Fetches non-archived, non-deactivated, internal awork users for the picker UI.
    /// </summary>
    public async Task<List<AworkUser>> GetUsers(Guid userId)
    {
        var result = await MakeAworkRequest<List<AworkUser>>(userId, "users");
        return result?
            .Where(user => !user.IsArchived && !user.IsDeactivated && !user.IsExternal)
            .ToList() ?? [];
    }

    /// <summary>
    /// Fetches project statuses for the given project, including workflow-inherited statuses.
    /// </summary>
    public async Task<List<AworkProjectStatus>> GetProjectStatuses(Guid userId, Guid projectId)
    {
        var result = await MakeAworkRequest<List<AworkProjectStatus>>(userId, $"projects/{projectId}/projectstatuses");
        return result ?? [];
    }

    /// <summary>
    /// Legacy fallback for fetching project statuses by project type.
    /// </summary>
    public async Task<List<AworkProjectStatus>> GetProjectTypeStatuses(Guid userId, Guid projectTypeId)
    {
        var result = await MakeAworkRequest<List<AworkProjectStatus>>(userId, $"projecttypes/{projectTypeId}/projectstatuses");
        return result ?? [];
    }

    /// <summary>
    /// Fetches task statuses for the given project.
    /// </summary>
    public async Task<List<AworkTaskStatus>> GetTaskStatuses(Guid userId, Guid projectId)
    {
        var result = await MakeAworkRequest<List<AworkTaskStatus>>(userId, $"projects/{projectId}/taskstatuses");
        return result ?? [];
    }

    /// <summary>
    /// Fetches task lists for the given project.
    /// </summary>
    public async Task<List<AworkTaskList>> GetTaskLists(Guid userId, Guid projectId)
    {
        var result = await MakeAworkRequest<List<AworkTaskList>>(userId, $"projects/{projectId}/tasklists");
        return result ?? [];
    }

    /// <summary>
    /// Fetches types of work visible to the current user.
    /// </summary>
    public async Task<List<AworkTypeOfWork>> GetTypesOfWork(Guid userId)
    {
        var result = await MakeAworkRequest<List<AworkTypeOfWork>>(userId, "typeofwork");
        return result ?? [];
    }

    /// <summary>
    /// Creates a type of work when a valid name is provided.
    /// </summary>
    public async Task<AworkTypeOfWork?> CreateTypeOfWork(Guid userId, string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return null;

        var request = new AworkCreateTypeOfWorkRequest
        {
            Name = name.Trim()
        };
        return await MakeAworkPostRequest<AworkTypeOfWork>(userId, "typeofwork", request);
    }

    /// <summary>
    /// Fetches project custom field definitions for a project.
    /// </summary>
    public async Task<List<AworkCustomFieldDefinition>> GetProjectCustomFields(Guid userId, Guid projectId)
    {
        var result = await MakeAworkRequest<List<AworkCustomFieldDefinition>>(userId, $"projects/{projectId}/customfielddefinitions");
        return result ?? [];
    }

    /// <summary>
    /// Fetches task custom field definitions.
    /// </summary>
    public async Task<List<AworkCustomFieldDefinition>> GetTaskCustomFieldDefinitions(Guid userId)
    {
        var result = await MakeAworkRequest<List<AworkCustomFieldDefinition>>(userId, "customfielddefinitions?filterby=entity eq 'task'");
        return result ?? [];
    }

    /// <summary>
    /// Creates an awork project.
    /// </summary>
    public async Task<AworkCreateProjectResponse?> CreateProject(Guid userId, AworkCreateProjectRequest request)
    {
        return await MakeAworkPostRequest<AworkCreateProjectResponse>(userId, "projects", request);
    }

    /// <summary>
    /// Creates an awork task in the given project.
    /// </summary>
    public async Task<AworkCreateTaskResponse?> CreateTask(Guid userId, Guid projectId, AworkCreateTaskRequest request)
    {
        request.EntityId = projectId;
        request.BaseType = "projecttask";
        return await MakeAworkPostRequest<AworkCreateTaskResponse>(userId, "tasks", request);
    }

    /// <summary>
    /// Links a custom field definition to a project.
    /// </summary>
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

    /// <summary>
    /// Sets custom field values on a task.
    /// </summary>
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

    /// <summary>
    /// Adds tags to a task.
    /// </summary>
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

    /// <summary>
    /// Assigns a user to a task.
    /// </summary>
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
            using var response = await SendAuthorizedRequest(userId, token =>
            {
                var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/tasks/{taskId}/setassignees");
                request.Headers.Add("Authorization", $"Bearer {token}");
                request.Content = new StringContent(jsonBody, System.Text.Encoding.UTF8, "application/json");
                return request;
            });
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to assign user {assigneeUserId} to task {taskId}: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Uploads a file attachment to a task.
    /// </summary>
    public async Task<bool> AttachFileToTask(Guid userId, Guid taskId, byte[] fileData, string fileName)
    {
        try
        {
            using var response = await SendAuthorizedRequest(userId, token =>
            {
                var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/tasks/{taskId}/files");
                request.Headers.Add("Authorization", $"Bearer {token}");

                var form = new MultipartFormDataContent();
                var fileContent = new ByteArrayContent(fileData);
                fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(GetMimeType(fileName));
                form.Add(fileContent, "file", fileName);
                request.Content = form;
                return request;
            });
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

    /// <summary>
    /// Sends a tracking event to awork.
    /// </summary>
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
        using var response = await SendAuthorizedRequest(userId, token =>
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}/{endpoint}");
            request.Headers.Add("Authorization", $"Bearer {token}");
            return request;
        });

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
        var jsonBody = JsonSerializer.Serialize(body, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });
        using var response = await SendAuthorizedRequest(userId, token =>
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/{endpoint}");
            request.Headers.Add("Authorization", $"Bearer {token}");
            request.Content = new StringContent(jsonBody, System.Text.Encoding.UTF8, "application/json");
            return request;
        });

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"awork API error: {response.StatusCode} - {errorBody}");
        }

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }

    private async Task<HttpResponseMessage> SendAuthorizedRequest(Guid userId, Func<string, HttpRequestMessage> requestFactory)
    {
        var accessToken = await GetValidAccessToken(userId);
        if (string.IsNullOrEmpty(accessToken))
            throw new UnauthorizedAccessException("No valid awork access token available. Please re-authenticate.");

        var response = await SendAsync(requestFactory, accessToken);
        if (response.StatusCode != System.Net.HttpStatusCode.Unauthorized)
            return response;

        response.Dispose();

        var refreshedToken = await GetValidAccessToken(userId, forceRefresh: true);
        if (string.IsNullOrEmpty(refreshedToken))
            throw new UnauthorizedAccessException("awork API returned unauthorized. Please re-authenticate.");

        var retryResponse = await SendAsync(requestFactory, refreshedToken);
        if (retryResponse.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            retryResponse.Dispose();
            throw new UnauthorizedAccessException("awork API returned unauthorized. Please re-authenticate.");
        }

        return retryResponse;
    }

    private async Task<HttpResponseMessage> SendAsync(Func<string, HttpRequestMessage> requestFactory, string accessToken)
    {
        using var request = requestFactory(accessToken);
        return await _httpClient.SendAsync(request);
    }
}
