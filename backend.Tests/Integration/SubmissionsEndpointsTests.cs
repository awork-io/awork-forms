using System.Net.Http.Json;
using System.Text.Json;
using Backend.Forms;
using Backend.Data;
using Backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Backend.Tests.Integration;

[Collection("Integration")]
public class SubmissionsEndpointsTests
{
    private readonly IntegrationTestFactory _factory;

    public SubmissionsEndpointsTests(IntegrationTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ListSubmissions_ReturnsSubmittedForm()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var client = _factory.CreateAuthenticatedClient(token);

        var fieldId = "field-1";
        var fieldsJson = JsonSerializer.Serialize(new[]
        {
            new { id = fieldId, type = "text", label = "Field", required = false, placeholder = "" }
        });

        var createDto = new CreateFormDto
        {
            Name = "Submission Form",
            FieldsJson = fieldsJson,
            IsActive = true
        };

        var createResponse = await client.PostAsJsonAsync("/api/forms", createDto);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);

        var submitDto = new CreateSubmissionDto
        {
            Data = new Dictionary<string, object> { [fieldId] = "hello" }
        };

        var submitResponse = await client.PostAsJsonAsync($"/api/f/{created!.PublicId}/submit", submitDto);
        submitResponse.EnsureSuccessStatusCode();

        var submissions = await client.GetFromJsonAsync<List<SubmissionListDto>>("/api/submissions");
        Assert.NotNull(submissions);
        Assert.Contains(submissions!, s => s.FormId == created.Id);

        var formSubmissions = await client.GetFromJsonAsync<List<SubmissionListDto>>($"/api/forms/{created.Id}/submissions");
        Assert.NotNull(formSubmissions);
        Assert.NotEmpty(formSubmissions!);
    }

    [Fact]
    public async Task RetryFailedSubmission_UsesLatestFormConfigAndCompletes()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var client = _factory.CreateAuthenticatedClient(token);

        var fields = new[]
        {
            new { id = "field-name", type = "text", label = "Name" },
            new { id = "field-description", type = "textarea", label = "Description" }
        };

        var initialMappings = new
        {
            taskFieldMappings = new[]
            {
                new { formFieldId = "field-name", aworkField = "name" }
            },
            projectFieldMappings = Array.Empty<object>()
        };

        var createResponse = await client.PostAsJsonAsync("/api/forms", new CreateFormDto
        {
            Name = "Retry Form",
            FieldsJson = JsonSerializer.Serialize(fields),
            FieldMappingsJson = JsonSerializer.Serialize(initialMappings),
            ActionType = "task",
            AworkProjectId = IntegrationTestFactory.AworkProjectId,
            AworkTypeOfWorkId = IntegrationTestFactory.AworkTypeOfWorkId,
            IsActive = true
        });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);

        var submissionId = await SeedFailedSubmissionAsync(created!.Id, JsonSerializer.Serialize(new Dictionary<string, object>
        {
            ["field-name"] = "Retry me",
            ["field-description"] = "Use latest mapping"
        }));

        var updatedMappings = new
        {
            taskFieldMappings = new[]
            {
                new { formFieldId = "field-name", aworkField = "name" },
                new { formFieldId = "field-description", aworkField = "description" }
            },
            projectFieldMappings = Array.Empty<object>()
        };

        var updateResponse = await client.PutAsJsonAsync($"/api/forms/{created.Id}", new UpdateFormDto
        {
            Name = created.Name,
            Description = created.Description,
            NameTranslations = created.NameTranslations,
            DescriptionTranslations = created.DescriptionTranslations,
            FieldsJson = created.FieldsJson,
            ActionType = created.ActionType,
            AworkProjectId = created.AworkProjectId,
            AworkProjectTypeId = created.AworkProjectTypeId,
            AworkTaskListId = created.AworkTaskListId,
            AworkTaskStatusId = created.AworkTaskStatusId,
            AworkTypeOfWorkId = created.AworkTypeOfWorkId,
            AworkAssigneeId = created.AworkAssigneeId,
            AworkTaskIsPriority = created.AworkTaskIsPriority,
            AworkTaskTag = created.AworkTaskTag,
            FieldMappingsJson = JsonSerializer.Serialize(updatedMappings),
            PrimaryColor = created.PrimaryColor,
            BackgroundColor = created.BackgroundColor,
            LogoUrl = created.LogoUrl,
            IsSharedWithWorkspace = created.IsSharedWithWorkspace,
            IsActive = created.IsActive
        });
        updateResponse.EnsureSuccessStatusCode();

        var taskRequestCountBeforeRetry = (await GetAworkRequestBodiesAsync("/api/v1/tasks")).Count;

        var retryResponse = await client.PostAsync($"/api/submissions/{submissionId}/retry", null);
        retryResponse.EnsureSuccessStatusCode();

        var updatedSubmission = await retryResponse.Content.ReadFromJsonAsync<SubmissionListDto>();
        Assert.NotNull(updatedSubmission);
        Assert.Equal("completed", updatedSubmission!.Status);
        Assert.Equal(IntegrationTestFactory.AworkCreatedTaskId, updatedSubmission.AworkTaskId);
        Assert.Null(updatedSubmission.ErrorMessage);

        var taskBodies = await GetAworkRequestBodiesAsync("/api/v1/tasks");
        var taskBody = Assert.Single(taskBodies.Skip(taskRequestCountBeforeRetry));
        Assert.Equal("Use latest mapping", GetJsonStringProperty(taskBody, "description"));
    }

    [Fact]
    public async Task RetrySubmission_WhenStatusIsNotFailed_ReturnsBadRequest()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var client = _factory.CreateAuthenticatedClient(token);

        var createResponse = await client.PostAsJsonAsync("/api/forms", new CreateFormDto
        {
            Name = "Completed Submission Form",
            FieldsJson = "[]",
            IsActive = true
        });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);

        var submissionId = await SeedSubmissionAsync(created!.Id, "{}", "completed");

        var retryResponse = await client.PostAsync($"/api/submissions/{submissionId}/retry", null);

        Assert.Equal(System.Net.HttpStatusCode.BadRequest, retryResponse.StatusCode);
        var payload = await retryResponse.Content.ReadAsStringAsync();
        Assert.Contains("Only failed submissions can be retried", payload);
    }

    private async Task<int> SeedFailedSubmissionAsync(int formId, string dataJson)
    {
        return await SeedSubmissionAsync(formId, dataJson, "failed", "Processing error: old failure");
    }

    private async Task<int> SeedSubmissionAsync(int formId, string dataJson, string status, string? errorMessage = null)
    {
        using var scope = _factory.Services.CreateScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<AppDbContext>>();
        await using var db = await dbFactory.CreateDbContextAsync();

        var submission = new Submission
        {
            FormId = formId,
            DataJson = dataJson,
            Status = status,
            ErrorMessage = errorMessage,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Submissions.Add(submission);
        await db.SaveChangesAsync();

        return submission.Id;
    }

    private async Task<List<string>> GetAworkRequestBodiesAsync(string path, string method = "POST")
    {
        using var aworkClient = new HttpClient { BaseAddress = new Uri(_factory.AworkAdminBaseUrl) };
        var response = await aworkClient.GetAsync("/__admin/requests");
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
    private static string? GetJsonStringProperty(string json, string propertyName)
    {
        using var document = JsonDocument.Parse(json);
        return document.RootElement.TryGetProperty(propertyName, out var property)
            ? property.GetString()
            : null;
    }
}
