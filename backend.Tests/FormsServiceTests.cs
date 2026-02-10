using Backend.Data;
using Backend.Data.Entities;
using Backend.Forms;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Backend.Tests;

public class FormsServiceTests : IDisposable
{
    private readonly IDbContextFactory<AppDbContext> _dbFactory;
    private readonly FormsService _formsService;
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _workspaceId = Guid.NewGuid();
    private readonly Guid _otherWorkspaceUserId = Guid.NewGuid();
    private readonly Guid _otherWorkspaceId = Guid.NewGuid();

    public FormsServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbFactory = new TestDbContextFactory(options);
        _formsService = new FormsService(_dbFactory);

        // Create test user
        using var db = _dbFactory.CreateDbContext();
        db.Users.Add(new User
        {
            Id = _testUserId,
            Email = "test@example.com",
            Name = "Test User",
            AworkUserId = Guid.NewGuid(),
            AworkWorkspaceId = _workspaceId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        db.Users.Add(new User
        {
            Id = _otherWorkspaceUserId,
            Email = "other@example.com",
            Name = "Other User",
            AworkUserId = Guid.NewGuid(),
            AworkWorkspaceId = _otherWorkspaceId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        db.SaveChanges();
    }

    public void Dispose() => GC.SuppressFinalize(this);

    [Fact]
    public void CreateForm_WithValidData_ReturnsFormWithId()
    {
        var dto = new CreateFormDto { Name = "Test Form", Description = "Test Description" };
        var result = _formsService.CreateForm(dto, _testUserId);

        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.Equal("Test Form", result.Name);
        Assert.Equal("Test Description", result.Description);
        Assert.NotEqual(Guid.Empty, result.PublicId);
        Assert.True(result.IsActive);
    }

    [Fact]
    public void CreateForm_GeneratesUniquePublicId()
    {
        var form1 = _formsService.CreateForm(new CreateFormDto { Name = "Form 1" }, _testUserId);
        var form2 = _formsService.CreateForm(new CreateFormDto { Name = "Form 2" }, _testUserId);

        Assert.NotEqual(form1.PublicId, form2.PublicId);
    }

    [Fact]
    public void GetFormById_WithExistingForm_ReturnsForm()
    {
        var created = _formsService.CreateForm(new CreateFormDto { Name = "Test Form" }, _testUserId);
        var result = _formsService.GetFormById(created.Id, _testUserId);

        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal("Test Form", result.Name);
    }

    [Fact]
    public void GetFormById_WithNonExistingForm_ReturnsNull()
    {
        var result = _formsService.GetFormById(9999, _testUserId);
        Assert.Null(result);
    }

    [Fact]
    public void GetFormById_WithWrongUser_ReturnsNull()
    {
        var created = _formsService.CreateForm(new CreateFormDto { Name = "Test Form" }, _testUserId);
        var result = _formsService.GetFormById(created.Id, _otherWorkspaceUserId);
        Assert.Null(result);
    }

    [Fact]
    public void GetFormsByUser_ReturnsUserForms()
    {
        _formsService.CreateForm(new CreateFormDto { Name = "Form 1" }, _testUserId);
        _formsService.CreateForm(new CreateFormDto { Name = "Form 2" }, _testUserId);

        var result = _formsService.GetFormsByUser(_testUserId);
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void GetFormsByUser_WithNoForms_ReturnsEmptyList()
    {
        var result = _formsService.GetFormsByUser(_otherWorkspaceUserId);
        Assert.Empty(result);
    }

    [Fact]
    public void UpdateForm_WithValidData_UpdatesForm()
    {
        var created = _formsService.CreateForm(new CreateFormDto { Name = "Original Name" }, _testUserId);
        var result = _formsService.UpdateForm(created.Id, new UpdateFormDto { Name = "Updated Name" }, _testUserId);

        Assert.NotNull(result);
        Assert.Equal("Updated Name", result.Name);
    }

    [Fact]
    public void UpdateForm_WithNonExistingForm_ReturnsNull()
    {
        var result = _formsService.UpdateForm(9999, new UpdateFormDto { Name = "Updated Name" }, _testUserId);
        Assert.Null(result);
    }

    [Fact]
    public void UpdateForm_PartialUpdate_KeepsExistingValues()
    {
        var created = _formsService.CreateForm(new CreateFormDto { Name = "Original Name", Description = "Original Description" }, _testUserId);
        var result = _formsService.UpdateForm(created.Id, new UpdateFormDto { Name = "Updated Name" }, _testUserId);

        Assert.NotNull(result);
        Assert.Equal("Updated Name", result.Name);
        Assert.Equal("Original Description", result.Description);
    }

    [Fact]
    public void DeleteForm_WithExistingForm_ReturnsTrue()
    {
        var created = _formsService.CreateForm(new CreateFormDto { Name = "Test Form" }, _testUserId);
        var result = _formsService.DeleteForm(created.Id, _testUserId);

        Assert.True(result);
        Assert.Null(_formsService.GetFormById(created.Id, _testUserId));
    }

    [Fact]
    public void DeleteForm_WithNonExistingForm_ReturnsFalse()
    {
        var result = _formsService.DeleteForm(9999, _testUserId);
        Assert.False(result);
    }

    [Fact]
    public void DeleteForm_WithWrongUser_ReturnsFalse()
    {
        var created = _formsService.CreateForm(new CreateFormDto { Name = "Test Form" }, _testUserId);
        var result = _formsService.DeleteForm(created.Id, _otherWorkspaceUserId);

        Assert.False(result);
        Assert.NotNull(_formsService.GetFormById(created.Id, _testUserId));
    }

    [Fact]
    public void GetPublicFormByPublicId_WithExistingForm_ReturnsPublicFormDto()
    {
        var created = _formsService.CreateForm(new CreateFormDto { Name = "Public Test Form", PrimaryColor = "#FF0000" }, _testUserId);
        var result = _formsService.GetPublicFormByPublicId(created.PublicId);

        Assert.NotNull(result);
        Assert.Equal(created.PublicId, result.PublicId);
        Assert.Equal("Public Test Form", result.Name);
        Assert.Equal("#FF0000", result.PrimaryColor);
    }

    [Fact]
    public void GetPublicFormByPublicId_WithNonExistingForm_ReturnsNull()
    {
        var result = _formsService.GetPublicFormByPublicId(Guid.NewGuid());
        Assert.Null(result);
    }

    [Fact]
    public void CreateSubmission_CreatesSubmissionWithPendingStatus()
    {
        var form = _formsService.CreateForm(new CreateFormDto { Name = "Test Form" }, _testUserId);
        var dataJson = "{\"name\": \"John\", \"email\": \"john@example.com\"}";
        var result = _formsService.CreateSubmission(form.Id, dataJson);

        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.Equal(form.Id, result.FormId);
        Assert.Equal(dataJson, result.DataJson);
        Assert.Equal("pending", result.Status);
    }

    [Fact]
    public void GetSubmissionsByForm_ReturnsFormSubmissions()
    {
        var form = _formsService.CreateForm(new CreateFormDto { Name = "Test Form" }, _testUserId);
        _formsService.CreateSubmission(form.Id, "{\"field1\": \"value1\"}");
        _formsService.CreateSubmission(form.Id, "{\"field2\": \"value2\"}");

        var result = _formsService.GetSubmissionsByForm(form.Id, _testUserId);
        Assert.Equal(2, result.Count);
        Assert.All(result, s => Assert.Equal("Test Form", s.FormName));
    }

    [Fact]
    public void GetSubmissionsByUser_ReturnsAllUserSubmissions()
    {
        var form1 = _formsService.CreateForm(new CreateFormDto { Name = "Form 1" }, _testUserId);
        var form2 = _formsService.CreateForm(new CreateFormDto { Name = "Form 2" }, _testUserId);
        _formsService.CreateSubmission(form1.Id, "{}");
        _formsService.CreateSubmission(form2.Id, "{}");

        var result = _formsService.GetSubmissionsByUser(_testUserId);
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void CreateForm_WithFieldsJson_StoresFields()
    {
        var fieldsJson = "[{\"id\":\"1\",\"type\":\"text\",\"label\":\"Name\"}]";
        var result = _formsService.CreateForm(new CreateFormDto { Name = "Test Form", FieldsJson = fieldsJson }, _testUserId);

        Assert.Equal(fieldsJson, result.FieldsJson);
    }

    [Fact]
    public void UpdateForm_CanToggleIsActive()
    {
        var created = _formsService.CreateForm(new CreateFormDto { Name = "Test Form" }, _testUserId);
        Assert.True(created.IsActive);

        var result = _formsService.UpdateForm(created.Id, new UpdateFormDto { IsActive = false }, _testUserId);
        Assert.NotNull(result);
        Assert.False(result.IsActive);
    }

    [Fact]
    public void DuplicateForm_CreatesNewIdsAndCopiesConfiguration()
    {
        var createDto = new CreateFormDto
        {
            Name = "Original",
            Description = "Original desc",
            NameTranslations = new Dictionary<string, string> { ["de"] = "Original DE" },
            DescriptionTranslations = new Dictionary<string, string> { ["de"] = "Beschreibung DE" },
            FieldsJson = "[{\"id\":\"field-1\",\"type\":\"select\",\"label\":\"Kategorie\",\"options\":[{\"label\":\"Support\",\"value\":\"option1\"}]}]",
            ActionType = "task",
            AworkProjectId = Guid.NewGuid(),
            AworkProjectTypeId = Guid.NewGuid(),
            AworkTaskListId = Guid.NewGuid(),
            AworkTaskStatusId = Guid.NewGuid(),
            AworkTypeOfWorkId = Guid.NewGuid(),
            AworkAssigneeId = Guid.NewGuid(),
            AworkTaskIsPriority = true,
            AworkTaskTag = "support",
            FieldMappingsJson = "{\"taskFieldMappings\":[{\"formFieldId\":\"field-1\",\"aworkField\":\"tags\"}]}",
            PrimaryColor = "#006dfa",
            BackgroundColor = "#f8fafc",
            IsActive = true
        };

        var created = _formsService.CreateForm(createDto, _testUserId);
        var duplicated = _formsService.DuplicateForm(created.Id, _testUserId);

        Assert.NotNull(duplicated);
        Assert.NotEqual(created.Id, duplicated!.Id);
        Assert.NotEqual(created.PublicId, duplicated.PublicId);
        Assert.Equal("Original Copy", duplicated.Name);
        Assert.Equal(created.Description, duplicated.Description);
        Assert.Equal(created.NameTranslations!["de"], duplicated.NameTranslations!["de"]);
        Assert.Equal(created.DescriptionTranslations!["de"], duplicated.DescriptionTranslations!["de"]);
        Assert.Equal(created.FieldsJson, duplicated.FieldsJson);
        Assert.Equal(created.ActionType, duplicated.ActionType);
        Assert.Equal(created.AworkProjectId, duplicated.AworkProjectId);
        Assert.Equal(created.AworkProjectTypeId, duplicated.AworkProjectTypeId);
        Assert.Equal(created.AworkTaskListId, duplicated.AworkTaskListId);
        Assert.Equal(created.AworkTaskStatusId, duplicated.AworkTaskStatusId);
        Assert.Equal(created.AworkTypeOfWorkId, duplicated.AworkTypeOfWorkId);
        Assert.Equal(created.AworkAssigneeId, duplicated.AworkAssigneeId);
        Assert.Equal(created.AworkTaskIsPriority, duplicated.AworkTaskIsPriority);
        Assert.Equal(created.AworkTaskTag, duplicated.AworkTaskTag);
        Assert.Equal(created.FieldMappingsJson, duplicated.FieldMappingsJson);
        Assert.Equal(created.PrimaryColor, duplicated.PrimaryColor);
        Assert.Equal(created.BackgroundColor, duplicated.BackgroundColor);
        Assert.Equal(created.IsActive, duplicated.IsActive);
    }

    [Fact]
    public void DuplicateForm_CopiesLogoDataAndUsesNewPublicLogoUrl()
    {
        var created = _formsService.CreateForm(new CreateFormDto { Name = "Logo Source" }, _testUserId);

        using (var db = _dbFactory.CreateDbContext())
        {
            var dbForm = db.Forms.First(f => f.Id == created.Id);
            dbForm.LogoData = [1, 2, 3, 4];
            dbForm.LogoContentType = "image/png";
            dbForm.LogoUrl = $"/api/f/{created.PublicId}/logo";
            db.SaveChanges();
        }

        var duplicated = _formsService.DuplicateForm(created.Id, _testUserId);
        Assert.NotNull(duplicated);

        using var verifyDb = _dbFactory.CreateDbContext();
        var duplicatedEntity = verifyDb.Forms.First(f => f.Id == duplicated!.Id);
        Assert.Equal([1, 2, 3, 4], duplicatedEntity.LogoData);
        Assert.Equal("image/png", duplicatedEntity.LogoContentType);
        Assert.Equal($"/api/f/{duplicated.PublicId}/logo", duplicatedEntity.LogoUrl);
    }

    [Fact]
    public void DuplicateForm_WhenMultipleCopiesExist_AppendsIncrementingCounter()
    {
        var created = _formsService.CreateForm(new CreateFormDto { Name = "Original" }, _testUserId);

        var duplicate1 = _formsService.DuplicateForm(created.Id, _testUserId);
        var duplicate2 = _formsService.DuplicateForm(created.Id, _testUserId);
        var duplicate3 = _formsService.DuplicateForm(created.Id, _testUserId);

        Assert.Equal("Original Copy", duplicate1!.Name);
        Assert.Equal("Original Copy 2", duplicate2!.Name);
        Assert.Equal("Original Copy 3", duplicate3!.Name);
    }
}

internal class TestDbContextFactory : IDbContextFactory<AppDbContext>
{
    private readonly DbContextOptions<AppDbContext> _options;

    public TestDbContextFactory(DbContextOptions<AppDbContext> options) => _options = options;

    public AppDbContext CreateDbContext() => new(_options);
}
