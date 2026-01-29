using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Forms;
using Xunit;

namespace Backend.Tests.Integration;

[Collection("Integration")]
public class FormsEndpointsTests
{
    private readonly IntegrationTestFactory _factory;

    public FormsEndpointsTests(IntegrationTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateUpdateAndDeleteForm_PersistsAworkTag()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var client = _factory.CreateAuthenticatedClient(token);

        var createDto = new CreateFormDto
        {
            Name = "Tag Form",
            Description = "tag test",
            FieldsJson = "[]",
            ActionType = "task",
            AworkTaskTag = "initial-tag"
        };

        var createResponse = await client.PostAsJsonAsync("/api/forms", createDto);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);
        Assert.Equal("initial-tag", created!.AworkTaskTag);

        var updateDto = new UpdateFormDto
        {
            AworkTaskTag = "updated-tag",
            AworkTaskIsPriority = true
        };

        var updateResponse = await client.PutAsJsonAsync($"/api/forms/{created.Id}", updateDto);
        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(updated);
        Assert.Equal("updated-tag", updated!.AworkTaskTag);
        Assert.True(updated.AworkTaskIsPriority);

        var list = await client.GetFromJsonAsync<List<FormListDto>>("/api/forms");
        Assert.NotNull(list);
        Assert.Contains(list!, form => form.Id == created.Id);

        var deleteResponse = await client.DeleteAsync($"/api/forms/{created.Id}");
        deleteResponse.EnsureSuccessStatusCode();

        var getResponse = await client.GetAsync($"/api/forms/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task GetForm_ReturnsTranslationsAndFields()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var client = _factory.CreateAuthenticatedClient(token);

        var fieldsJson = JsonSerializer.Serialize(new[]
        {
            new { id = "field-1", type = "text", label = "Field", required = false, placeholder = "" }
        });

        var createDto = new CreateFormDto
        {
            Name = "Localized",
            NameTranslations = new Dictionary<string, string> { ["de"] = "Lokal" },
            DescriptionTranslations = new Dictionary<string, string> { ["de"] = "Beschreibung" },
            FieldsJson = fieldsJson
        };

        var createResponse = await client.PostAsJsonAsync("/api/forms", createDto);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);

        var fetched = await client.GetFromJsonAsync<FormDetailDto>($"/api/forms/{created!.Id}");
        Assert.NotNull(fetched);
        Assert.Equal("Lokal", fetched!.NameTranslations!["de"]);
        Assert.Contains("field-1", fetched.FieldsJson);
    }
}
