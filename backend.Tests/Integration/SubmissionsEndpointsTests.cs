using System.Net.Http.Json;
using System.Text.Json;
using Backend.Forms;
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
}
