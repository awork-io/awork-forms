using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Forms;
using Xunit;

namespace Backend.Tests.Integration;

[Collection("Integration")]
public class PublicFormEndpointsTests
{
    private readonly IntegrationTestFactory _factory;

    public PublicFormEndpointsTests(IntegrationTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PublicForm_Submit_WritesSubmission()
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
            Name = "Public",
            FieldsJson = fieldsJson,
            IsActive = true
        };

        var createResponse = await client.PostAsJsonAsync("/api/forms", createDto);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);

        var publicForm = await client.GetFromJsonAsync<PublicFormDto>($"/api/f/{created!.PublicId}");
        Assert.NotNull(publicForm);
        Assert.Equal(created.Name, publicForm!.Name);

        var submitDto = new CreateSubmissionDto
        {
            Data = new Dictionary<string, object> { [fieldId] = "hello" }
        };

        var submitResponse = await client.PostAsJsonAsync($"/api/f/{created.PublicId}/submit", submitDto);
        Assert.Equal(HttpStatusCode.Created, submitResponse.StatusCode);

        var payload = await submitResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.NotNull(payload);
        Assert.True(payload!.ContainsKey("submissionId"));
    }
}
