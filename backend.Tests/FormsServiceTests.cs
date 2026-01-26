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
    private readonly int _testUserId = 1;

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
            AworkUserId = "awork-123",
            AworkWorkspaceId = "workspace-456",
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
        var result = _formsService.GetFormById(created.Id, 999);
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
        var result = _formsService.GetFormsByUser(999);
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
        var result = _formsService.DeleteForm(created.Id, 999);

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
}

internal class TestDbContextFactory : IDbContextFactory<AppDbContext>
{
    private readonly DbContextOptions<AppDbContext> _options;

    public TestDbContextFactory(DbContextOptions<AppDbContext> options) => _options = options;

    public AppDbContext CreateDbContext() => new(_options);
}
