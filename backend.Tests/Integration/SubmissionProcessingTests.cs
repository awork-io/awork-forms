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
}
