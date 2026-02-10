using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Forms;
using Xunit;

namespace Backend.Tests.Integration;

[Collection("Integration")]
public class SubmissionProcessingTests
{
    private readonly IntegrationTestFactory _factory;

    public SubmissionProcessingTests(IntegrationTestFactory factory)
    {
        _factory = factory;
    }

    private sealed class SubmitResponse
    {
        public bool Success { get; set; }
        public int SubmissionId { get; set; }
        public Guid? AworkProjectId { get; set; }
        public Guid? AworkTaskId { get; set; }
    }

    [Fact]
    public async Task SubmitForm_ActionBoth_CreatesProjectAndTask()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var authedClient = _factory.CreateAuthenticatedClient(token);

        var fields = new[]
        {
            new { id = "field-name", type = "text", label = "Name" },
            new { id = "field-desc", type = "text", label = "Description" },
            new { id = "field-tags", type = "text", label = "Tags" }
        };

        var mappings = new
        {
            taskFieldMappings = new[]
            {
                new { formFieldId = "field-name", aworkField = "name" },
                new { formFieldId = "field-desc", aworkField = "description" },
                new { formFieldId = "field-tags", aworkField = "tags" }
            },
            projectFieldMappings = new[]
            {
                new { formFieldId = "field-name", aworkField = "name" },
                new { formFieldId = "field-desc", aworkField = "description" }
            }
        };

        var createDto = new CreateFormDto
        {
            Name = "Both Form",
            FieldsJson = JsonSerializer.Serialize(fields),
            FieldMappingsJson = JsonSerializer.Serialize(mappings),
            ActionType = "both",
            AworkProjectTypeId = IntegrationTestFactory.AworkProjectTypeId,
            AworkTaskStatusId = IntegrationTestFactory.AworkTaskStatusId,
            AworkTaskListId = IntegrationTestFactory.AworkTaskListId,
            AworkTypeOfWorkId = IntegrationTestFactory.AworkTypeOfWorkId,
            AworkAssigneeId = IntegrationTestFactory.AworkUserId,
            AworkTaskTag = "form-tag",
            IsActive = true
        };

        var createResponse = await authedClient.PostAsJsonAsync("/api/forms", createDto);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);

        using var publicClient = _factory.CreateClient();
        var submitDto = new CreateSubmissionDto
        {
            Data = new Dictionary<string, object>
            {
                ["field-name"] = "Submission Name",
                ["field-desc"] = "Submission Description",
                ["field-tags"] = "alpha, beta"
            }
        };

        var submitResponse = await publicClient.PostAsJsonAsync($"/api/f/{created!.PublicId}/submit", submitDto);
        Assert.Equal(HttpStatusCode.Created, submitResponse.StatusCode);

        var raw = await submitResponse.Content.ReadAsStringAsync();
        var payload = JsonSerializer.Deserialize<SubmitResponse>(raw, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(payload);
        Assert.True(payload!.Success);
        Assert.True(payload.AworkProjectId.HasValue, raw);
        Assert.True(payload.AworkTaskId.HasValue, raw);
        Assert.Equal(IntegrationTestFactory.AworkCreatedProjectId, payload.AworkProjectId.Value);
        Assert.Equal(IntegrationTestFactory.AworkCreatedTaskId, payload.AworkTaskId.Value);
    }

    [Fact]
    public async Task SubmitForm_SelectMapping_UsesPrimaryOptionLabelForTags()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var authedClient = _factory.CreateAuthenticatedClient(token);

        var fields = new[]
        {
            new
            {
                id = "field-tags",
                type = "select",
                label = "Kategorie",
                options = new[]
                {
                    new { label = "Produkt", value = "option1" },
                    new { label = "Support", value = "option2" }
                }
            }
        };

        var mappings = new
        {
            taskFieldMappings = new[]
            {
                new { formFieldId = "field-tags", aworkField = "tags" }
            },
            projectFieldMappings = Array.Empty<object>()
        };

        var createDto = new CreateFormDto
        {
            Name = "Tag Mapping Form",
            FieldsJson = JsonSerializer.Serialize(fields),
            FieldMappingsJson = JsonSerializer.Serialize(mappings),
            ActionType = "task",
            AworkProjectId = IntegrationTestFactory.AworkProjectId,
            IsActive = true
        };

        var createResponse = await authedClient.PostAsJsonAsync("/api/forms", createDto);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);

        using var publicClient = _factory.CreateClient();
        var submitDto = new CreateSubmissionDto
        {
            Data = new Dictionary<string, object>
            {
                ["field-tags"] = "option2"
            }
        };

        var submitResponse = await publicClient.PostAsJsonAsync($"/api/f/{created!.PublicId}/submit", submitDto);
        Assert.Equal(HttpStatusCode.Created, submitResponse.StatusCode);

        var addTagsBodies = await GetAworkRequestBodiesAsync("/api/v1/tasks/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/addtags");
        Assert.Contains(addTagsBodies, body => body.Contains("\"name\":\"Support\""));
        Assert.DoesNotContain(addTagsBodies, body => body.Contains("\"name\":\"option2\""));
    }

    [Fact]
    public async Task SubmitForm_TypeOfWorkMapping_CreatesWhenMissing_UsingPrimaryLabel()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var authedClient = _factory.CreateAuthenticatedClient(token);

        var fields = new[]
        {
            new
            {
                id = "field-type",
                type = "select",
                label = "Tätigkeit",
                options = new[]
                {
                    new { label = "Bugfix", value = "option1" },
                    new { label = "Entwicklung", value = "option2" }
                }
            }
        };

        var mappings = new
        {
            taskFieldMappings = new[]
            {
                new { formFieldId = "field-type", aworkField = "typeOfWork" }
            },
            projectFieldMappings = Array.Empty<object>()
        };

        var createDto = new CreateFormDto
        {
            Name = "TypeOfWork Mapping Form",
            FieldsJson = JsonSerializer.Serialize(fields),
            FieldMappingsJson = JsonSerializer.Serialize(mappings),
            ActionType = "task",
            AworkProjectId = IntegrationTestFactory.AworkProjectId,
            IsActive = true
        };

        var createResponse = await authedClient.PostAsJsonAsync("/api/forms", createDto);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);

        using var publicClient = _factory.CreateClient();
        var submitDto = new CreateSubmissionDto
        {
            Data = new Dictionary<string, object>
            {
                ["field-type"] = "option2"
            }
        };

        var submitResponse = await publicClient.PostAsJsonAsync($"/api/f/{created!.PublicId}/submit", submitDto);
        Assert.Equal(HttpStatusCode.Created, submitResponse.StatusCode);

        var createTypeBodies = await GetAworkRequestBodiesAsync("/api/v1/typeofwork", "POST");
        Assert.Contains(createTypeBodies, body => body.Contains("\"name\":\"Entwicklung\""));

        var taskBodies = await GetAworkRequestBodiesAsync("/api/v1/tasks", "POST");
        Assert.Contains(taskBodies, body => body.Contains($"\"typeOfWorkId\":\"{IntegrationTestFactory.AworkCreatedTypeOfWorkId}\""));
    }

    [Fact]
    public async Task SubmitForm_CustomSelectMapping_UsesRawOptionValueForSelectionResolution()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var authedClient = _factory.CreateAuthenticatedClient(token);

        var fields = new[]
        {
            new
            {
                id = "field-category",
                type = "select",
                label = "Kategorie",
                options = new[]
                {
                    new { label = "Support", value = "option2" }
                }
            }
        };

        var mappings = new
        {
            taskFieldMappings = new[]
            {
                new { formFieldId = "field-category", aworkField = $"custom:{IntegrationTestFactory.AworkSelectCustomFieldId}" }
            },
            projectFieldMappings = Array.Empty<object>()
        };

        var createDto = new CreateFormDto
        {
            Name = "Custom Select Mapping Form",
            FieldsJson = JsonSerializer.Serialize(fields),
            FieldMappingsJson = JsonSerializer.Serialize(mappings),
            ActionType = "task",
            AworkProjectId = IntegrationTestFactory.AworkProjectId,
            IsActive = true
        };

        var createResponse = await authedClient.PostAsJsonAsync("/api/forms", createDto);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);

        using var publicClient = _factory.CreateClient();
        var submitDto = new CreateSubmissionDto
        {
            Data = new Dictionary<string, object>
            {
                ["field-category"] = "option2"
            }
        };

        var submitResponse = await publicClient.PostAsJsonAsync($"/api/f/{created!.PublicId}/submit", submitDto);
        Assert.Equal(HttpStatusCode.Created, submitResponse.StatusCode);

        var customFieldBodies = await GetAworkRequestBodiesAsync($"/api/v1/tasks/{IntegrationTestFactory.AworkCreatedTaskId}/setcustomfields", "POST");
        Assert.Contains(customFieldBodies, body =>
            body.Contains($"\"customFieldDefinitionId\":\"{IntegrationTestFactory.AworkSelectCustomFieldId}\"") &&
            body.Contains($"\"selectionOptionIdValue\":\"{IntegrationTestFactory.AworkSelectOptionId}\""));
    }

    private async Task<List<string>> GetAworkRequestBodiesAsync(string path, string method = "POST")
    {
        using var client = new HttpClient { BaseAddress = new Uri(_factory.AworkAdminBaseUrl) };
        var response = await client.GetAsync("/__admin/requests");
        response.EnsureSuccessStatusCode();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        if (!document.RootElement.TryGetProperty("requests", out var requestsElement) || requestsElement.ValueKind != JsonValueKind.Array)
            return [];

        var bodies = new List<string>();
        foreach (var requestEntry in requestsElement.EnumerateArray())
        {
            if (!requestEntry.TryGetProperty("request", out var request))
                continue;

            var requestUrl = request.TryGetProperty("url", out var urlElement) ? urlElement.GetString() : null;
            var requestMethod = request.TryGetProperty("method", out var methodElement) ? methodElement.GetString() : null;
            if (!string.Equals(requestMethod, method, StringComparison.OrdinalIgnoreCase))
                continue;
            if (!string.Equals(requestUrl, path, StringComparison.Ordinal))
                continue;

            var body = request.TryGetProperty("body", out var bodyElement) ? bodyElement.GetString() : null;
            bodies.Add(body ?? string.Empty);
        }

        return bodies;
    }
}
