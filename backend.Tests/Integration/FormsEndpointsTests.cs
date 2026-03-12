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
            AworkTypeOfWorkId = Guid.NewGuid(),
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

    [Fact]
    public async Task PrivateForm_IsHiddenFromOtherUsersInSameWorkspace()
    {
        var workspaceId = Guid.NewGuid();
        var (owner, ownerToken) = await _factory.SeedUserAsync(workspaceId, "owner-token", "owner@test.local", "Owner");
        var (_, teammateToken) = await _factory.SeedUserAsync(workspaceId, "teammate-token", "teammate@test.local", "Teammate");
        using var ownerClient = _factory.CreateAuthenticatedClient(ownerToken);
        using var teammateClient = _factory.CreateAuthenticatedClient(teammateToken);

        var createResponse = await ownerClient.PostAsJsonAsync("/api/forms", new CreateFormDto
        {
            Name = "Private Form",
            FieldsJson = "[]",
            IsSharedWithWorkspace = false
        });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);
        Assert.Equal(owner.Id, created!.CreatedBy);
        Assert.False(created.IsSharedWithWorkspace);

        var teammateList = await teammateClient.GetFromJsonAsync<List<FormListDto>>("/api/forms");
        Assert.NotNull(teammateList);
        Assert.DoesNotContain(teammateList!, form => form.Id == created.Id);

        var teammateGet = await teammateClient.GetAsync($"/api/forms/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, teammateGet.StatusCode);
    }

    [Fact]
    public async Task SharedForm_IsVisibleToOtherUsersInSameWorkspace()
    {
        var workspaceId = Guid.NewGuid();
        var (owner, ownerToken) = await _factory.SeedUserAsync(workspaceId, "owner-token-shared", "owner-shared@test.local", "Owner");
        var (_, teammateToken) = await _factory.SeedUserAsync(workspaceId, "teammate-token-shared", "teammate-shared@test.local", "Teammate");
        using var ownerClient = _factory.CreateAuthenticatedClient(ownerToken);
        using var teammateClient = _factory.CreateAuthenticatedClient(teammateToken);

        var createResponse = await ownerClient.PostAsJsonAsync("/api/forms", new CreateFormDto
        {
            Name = "Shared Form",
            FieldsJson = "[]",
            IsSharedWithWorkspace = true
        });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);
        Assert.Equal(owner.Id, created!.CreatedBy);

        var teammateList = await teammateClient.GetFromJsonAsync<List<FormListDto>>("/api/forms");
        Assert.NotNull(teammateList);
        Assert.Contains(teammateList!, form => form.Id == created.Id && form.CreatedBy == owner.Id);

        var teammateGet = await teammateClient.GetFromJsonAsync<FormDetailDto>($"/api/forms/{created.Id}");
        Assert.NotNull(teammateGet);
        Assert.Equal(owner.Id, teammateGet!.CreatedBy);
    }

    [Fact]
    public async Task SharedForm_CannotBeDeletedByTeammate()
    {
        var workspaceId = Guid.NewGuid();
        var (owner, ownerToken) = await _factory.SeedUserAsync(workspaceId, "owner-token-delete", "owner-delete@test.local", "Owner");
        var (_, teammateToken) = await _factory.SeedUserAsync(workspaceId, "teammate-token-delete", "teammate-delete@test.local", "Teammate");
        using var ownerClient = _factory.CreateAuthenticatedClient(ownerToken);
        using var teammateClient = _factory.CreateAuthenticatedClient(teammateToken);

        var createResponse = await ownerClient.PostAsJsonAsync("/api/forms", new CreateFormDto
        {
            Name = "Shared Delete Protected",
            FieldsJson = "[]",
            IsSharedWithWorkspace = true
        });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);
        Assert.Equal(owner.Id, created!.CreatedBy);

        var deleteResponse = await teammateClient.DeleteAsync($"/api/forms/{created.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);

        var ownerGet = await ownerClient.GetAsync($"/api/forms/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, ownerGet.StatusCode);
    }

    [Fact]
    public async Task DuplicateForm_CreatesIndependentCopyWithNewIds()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var client = _factory.CreateAuthenticatedClient(token);

        var createDto = new CreateFormDto
        {
            Name = "Original Form",
            Description = "Original desc",
            FieldsJson = "[{\"id\":\"f1\",\"type\":\"text\",\"label\":\"Name\"}]",
            ActionType = "task",
            AworkTypeOfWorkId = Guid.NewGuid(),
            AworkTaskTag = "test-tag"
        };

        var createResponse = await client.PostAsJsonAsync("/api/forms", createDto);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);

        var duplicateResponse = await client.PostAsync($"/api/forms/{created!.Id}/duplicate", null);
        Assert.Equal(HttpStatusCode.Created, duplicateResponse.StatusCode);

        var duplicated = await duplicateResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(duplicated);
        Assert.Equal($"/api/forms/{duplicated!.Id}", duplicateResponse.Headers.Location?.ToString());
        Assert.NotEqual(created.Id, duplicated!.Id);
        Assert.NotEqual(created.PublicId, duplicated.PublicId);
        Assert.Equal("Original Form Copy", duplicated.Name);
        Assert.Equal(created.Description, duplicated.Description);
        Assert.Equal(created.FieldsJson, duplicated.FieldsJson);
        Assert.Equal(created.ActionType, duplicated.ActionType);
        Assert.Equal(created.AworkTaskTag, duplicated.AworkTaskTag);

        var fetchedDuplicated = await client.GetAsync($"/api/forms/{duplicated.Id}");
        Assert.Equal(HttpStatusCode.OK, fetchedDuplicated.StatusCode);
        var fetchedDuplicatedBody = await fetchedDuplicated.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(fetchedDuplicatedBody);
        Assert.Equal(duplicated.Id, fetchedDuplicatedBody!.Id);
        Assert.Equal(duplicated.PublicId, fetchedDuplicatedBody.PublicId);

        var formsList = await client.GetFromJsonAsync<List<FormListDto>>("/api/forms");
        Assert.NotNull(formsList);
        Assert.Contains(formsList!, form => form.Id == created.Id);
        Assert.Contains(formsList!, form => form.Id == duplicated.Id && form.Name == duplicated.Name);
    }

    [Fact]
    public async Task DuplicateForm_WithoutAuth_ReturnsUnauthorizedInsteadOfMethodNotAllowed()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/forms/999/duplicate", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateForm_TaskActionWithoutTypeOfWork_ReturnsBadRequest()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var client = _factory.CreateAuthenticatedClient(token);

        var createDto = new CreateFormDto
        {
            Name = "Missing TypeOfWork",
            ActionType = "task",
            FieldsJson = "[]"
        };

        var response = await client.PostAsJsonAsync("/api/forms", createDto);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateForm_TaskActionWithRequiredFieldMapping_Succeeds()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var client = _factory.CreateAuthenticatedClient(token);

        var createDto = new CreateFormDto
        {
            Name = "Mapped TypeOfWork",
            ActionType = "task",
            FieldsJson = "[{\"id\":\"f1\",\"type\":\"select\",\"label\":\"Type\",\"required\":true}]",
            FieldMappingsJson = "{\"taskFieldMappings\":[{\"formFieldId\":\"f1\",\"aworkField\":\"typeOfWork\"}]}"
        };

        var response = await client.PostAsJsonAsync("/api/forms", createDto);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateForm_TaskActionWithNonRequiredFieldMapping_ReturnsBadRequest()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var client = _factory.CreateAuthenticatedClient(token);

        var createDto = new CreateFormDto
        {
            Name = "Non-Required TypeOfWork",
            ActionType = "task",
            FieldsJson = "[{\"id\":\"f1\",\"type\":\"select\",\"label\":\"Type\",\"required\":false}]",
            FieldMappingsJson = "{\"taskFieldMappings\":[{\"formFieldId\":\"f1\",\"aworkField\":\"typeOfWork\"}]}"
        };

        var response = await client.PostAsJsonAsync("/api/forms", createDto);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
