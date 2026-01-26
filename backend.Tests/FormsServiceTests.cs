using Backend.Database;
using Backend.Forms;
using Microsoft.Data.Sqlite;
using Xunit;

namespace Backend.Tests;

public class FormsServiceTests : IDisposable
{
    private readonly DbContextFactory _dbFactory;
    private readonly FormsService _formsService;
    private readonly int _testUserId = 1;
    // Keep a connection open to maintain the in-memory database
    private readonly SqliteConnection _keepAliveConnection;

    public FormsServiceTests()
    {
        // Use in-memory SQLite database for testing
        // Need to use a shared cache so all connections use the same in-memory database
        var connectionString = "Data Source=InMemoryTest;Mode=Memory;Cache=Shared";

        // Keep a connection open for the lifetime of the test to maintain the in-memory database
        _keepAliveConnection = new SqliteConnection(connectionString);
        _keepAliveConnection.Open();

        _dbFactory = new DbContextFactory(connectionString);

        // Initialize the database schema
        InitializeDatabase();

        // Create the forms service
        _formsService = new FormsService(_dbFactory);

        // Create a test user
        CreateTestUser();
    }

    private void InitializeDatabase()
    {
        using var ctx = _dbFactory.CreateContext();

        // Create Users table
        using var usersCmd = ctx.Connection.CreateCommand();
        usersCmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS Users (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Email TEXT NOT NULL,
                Name TEXT,
                AworkUserId TEXT,
                AworkWorkspaceId TEXT,
                AworkAccessToken TEXT,
                AworkRefreshToken TEXT,
                AworkTokenExpiresAt TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL
            )";
        usersCmd.ExecuteNonQuery();

        // Create Forms table
        using var formsCmd = ctx.Connection.CreateCommand();
        formsCmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS Forms (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                PublicId TEXT NOT NULL UNIQUE,
                UserId INTEGER NOT NULL,
                Name TEXT NOT NULL,
                Description TEXT,
                FieldsJson TEXT NOT NULL DEFAULT '[]',
                ActionType TEXT,
                AworkProjectId TEXT,
                AworkProjectTypeId TEXT,
                AworkTaskListId TEXT,
                AworkTaskStatusId TEXT,
                AworkTypeOfWorkId TEXT,
                AworkAssigneeId TEXT,
                AworkTaskIsPriority INTEGER,
                FieldMappingsJson TEXT,
                PrimaryColor TEXT,
                BackgroundColor TEXT,
                LogoUrl TEXT,
                IsActive INTEGER NOT NULL DEFAULT 1,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                FOREIGN KEY (UserId) REFERENCES Users(Id)
            )";
        formsCmd.ExecuteNonQuery();

        // Create Submissions table
        using var submissionsCmd = ctx.Connection.CreateCommand();
        submissionsCmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS Submissions (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                FormId INTEGER NOT NULL,
                DataJson TEXT NOT NULL DEFAULT '{}',
                Status TEXT NOT NULL DEFAULT 'pending',
                AworkProjectId TEXT,
                AworkTaskId TEXT,
                ErrorMessage TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                FOREIGN KEY (FormId) REFERENCES Forms(Id)
            )";
        submissionsCmd.ExecuteNonQuery();
    }

    private void CreateTestUser()
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO Users (Id, Email, Name, AworkUserId, AworkWorkspaceId, CreatedAt, UpdatedAt)
            VALUES (1, 'test@example.com', 'Test User', 'awork-123', 'workspace-456', @now, @now)";
        var p = cmd.CreateParameter();
        p.ParameterName = "@now";
        p.Value = DateTime.UtcNow.ToString("o");
        cmd.Parameters.Add(p);
        cmd.ExecuteNonQuery();
    }

    public void Dispose()
    {
        // Close the keep-alive connection, which disposes the in-memory database
        _keepAliveConnection?.Close();
        _keepAliveConnection?.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public void CreateForm_WithValidData_ReturnsFormWithId()
    {
        // Arrange
        var dto = new CreateFormDto
        {
            Name = "Test Form",
            Description = "Test Description"
        };

        // Act
        var result = _formsService.CreateForm(dto, _testUserId);

        // Assert
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
        // Arrange
        var dto1 = new CreateFormDto { Name = "Form 1" };
        var dto2 = new CreateFormDto { Name = "Form 2" };

        // Act
        var form1 = _formsService.CreateForm(dto1, _testUserId);
        var form2 = _formsService.CreateForm(dto2, _testUserId);

        // Assert
        Assert.NotEqual(form1.PublicId, form2.PublicId);
    }

    [Fact]
    public void GetFormById_WithExistingForm_ReturnsForm()
    {
        // Arrange
        var dto = new CreateFormDto { Name = "Test Form" };
        var created = _formsService.CreateForm(dto, _testUserId);

        // Act
        var result = _formsService.GetFormById(created.Id, _testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal("Test Form", result.Name);
    }

    [Fact]
    public void GetFormById_WithNonExistingForm_ReturnsNull()
    {
        // Act
        var result = _formsService.GetFormById(9999, _testUserId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void GetFormById_WithWrongUser_ReturnsNull()
    {
        // Arrange
        var dto = new CreateFormDto { Name = "Test Form" };
        var created = _formsService.CreateForm(dto, _testUserId);

        // Act - try to get form with different user
        var result = _formsService.GetFormById(created.Id, 999);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void GetFormsByUser_ReturnsUserForms()
    {
        // Arrange
        _formsService.CreateForm(new CreateFormDto { Name = "Form 1" }, _testUserId);
        _formsService.CreateForm(new CreateFormDto { Name = "Form 2" }, _testUserId);

        // Act
        var result = _formsService.GetFormsByUser(_testUserId);

        // Assert
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void GetFormsByUser_WithNoForms_ReturnsEmptyList()
    {
        // Act
        var result = _formsService.GetFormsByUser(999);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public void UpdateForm_WithValidData_UpdatesForm()
    {
        // Arrange
        var dto = new CreateFormDto { Name = "Original Name" };
        var created = _formsService.CreateForm(dto, _testUserId);

        var updateDto = new UpdateFormDto { Name = "Updated Name" };

        // Act
        var result = _formsService.UpdateForm(created.Id, updateDto, _testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated Name", result.Name);
    }

    [Fact]
    public void UpdateForm_WithNonExistingForm_ReturnsNull()
    {
        // Arrange
        var updateDto = new UpdateFormDto { Name = "Updated Name" };

        // Act
        var result = _formsService.UpdateForm(9999, updateDto, _testUserId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void UpdateForm_PartialUpdate_KeepsExistingValues()
    {
        // Arrange
        var dto = new CreateFormDto
        {
            Name = "Original Name",
            Description = "Original Description"
        };
        var created = _formsService.CreateForm(dto, _testUserId);

        var updateDto = new UpdateFormDto { Name = "Updated Name" };

        // Act
        var result = _formsService.UpdateForm(created.Id, updateDto, _testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated Name", result.Name);
        Assert.Equal("Original Description", result.Description);
    }

    [Fact]
    public void DeleteForm_WithExistingForm_ReturnsTrue()
    {
        // Arrange
        var dto = new CreateFormDto { Name = "Test Form" };
        var created = _formsService.CreateForm(dto, _testUserId);

        // Act
        var result = _formsService.DeleteForm(created.Id, _testUserId);

        // Assert
        Assert.True(result);
        Assert.Null(_formsService.GetFormById(created.Id, _testUserId));
    }

    [Fact]
    public void DeleteForm_WithNonExistingForm_ReturnsFalse()
    {
        // Act
        var result = _formsService.DeleteForm(9999, _testUserId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void DeleteForm_WithWrongUser_ReturnsFalse()
    {
        // Arrange
        var dto = new CreateFormDto { Name = "Test Form" };
        var created = _formsService.CreateForm(dto, _testUserId);

        // Act - try to delete with different user
        var result = _formsService.DeleteForm(created.Id, 999);

        // Assert
        Assert.False(result);
        // Form should still exist
        Assert.NotNull(_formsService.GetFormById(created.Id, _testUserId));
    }

    [Fact]
    public void GetPublicFormByPublicId_WithExistingForm_ReturnsPublicFormDto()
    {
        // Arrange
        var dto = new CreateFormDto
        {
            Name = "Public Test Form",
            PrimaryColor = "#FF0000"
        };
        var created = _formsService.CreateForm(dto, _testUserId);

        // Act
        var result = _formsService.GetPublicFormByPublicId(created.PublicId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(created.PublicId, result.PublicId);
        Assert.Equal("Public Test Form", result.Name);
        Assert.Equal("#FF0000", result.PrimaryColor);
    }

    [Fact]
    public void GetPublicFormByPublicId_WithNonExistingForm_ReturnsNull()
    {
        // Act
        var result = _formsService.GetPublicFormByPublicId(Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void CreateSubmission_CreatesSubmissionWithPendingStatus()
    {
        // Arrange
        var formDto = new CreateFormDto { Name = "Test Form" };
        var form = _formsService.CreateForm(formDto, _testUserId);
        var dataJson = "{\"name\": \"John\", \"email\": \"john@example.com\"}";

        // Act
        var result = _formsService.CreateSubmission(form.Id, dataJson);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.Equal(form.Id, result.FormId);
        Assert.Equal(dataJson, result.DataJson);
        Assert.Equal("pending", result.Status);
    }

    [Fact]
    public void GetSubmissionsByForm_ReturnsFormSubmissions()
    {
        // Arrange
        var formDto = new CreateFormDto { Name = "Test Form" };
        var form = _formsService.CreateForm(formDto, _testUserId);
        _formsService.CreateSubmission(form.Id, "{\"field1\": \"value1\"}");
        _formsService.CreateSubmission(form.Id, "{\"field2\": \"value2\"}");

        // Act
        var result = _formsService.GetSubmissionsByForm(form.Id, _testUserId);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.All(result, s => Assert.Equal("Test Form", s.FormName));
    }

    [Fact]
    public void GetSubmissionsByUser_ReturnsAllUserSubmissions()
    {
        // Arrange
        var form1 = _formsService.CreateForm(new CreateFormDto { Name = "Form 1" }, _testUserId);
        var form2 = _formsService.CreateForm(new CreateFormDto { Name = "Form 2" }, _testUserId);
        _formsService.CreateSubmission(form1.Id, "{}");
        _formsService.CreateSubmission(form2.Id, "{}");

        // Act
        var result = _formsService.GetSubmissionsByUser(_testUserId);

        // Assert
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void DeleteForm_AlsoDeletesSubmissions()
    {
        // Arrange
        var formDto = new CreateFormDto { Name = "Test Form" };
        var form = _formsService.CreateForm(formDto, _testUserId);
        _formsService.CreateSubmission(form.Id, "{}");
        _formsService.CreateSubmission(form.Id, "{}");

        // Verify submissions exist
        Assert.Equal(2, _formsService.GetSubmissionsByForm(form.Id, _testUserId).Count);

        // Act
        _formsService.DeleteForm(form.Id, _testUserId);

        // Assert - submissions should be deleted
        Assert.Empty(_formsService.GetSubmissionsByUser(_testUserId));
    }

    [Fact]
    public void CreateForm_WithFieldsJson_StoresFields()
    {
        // Arrange
        var fieldsJson = "[{\"id\":\"1\",\"type\":\"text\",\"label\":\"Name\"}]";
        var dto = new CreateFormDto
        {
            Name = "Test Form",
            FieldsJson = fieldsJson
        };

        // Act
        var result = _formsService.CreateForm(dto, _testUserId);

        // Assert
        Assert.Equal(fieldsJson, result.FieldsJson);
    }

    [Fact]
    public void UpdateForm_CanToggleIsActive()
    {
        // Arrange
        var dto = new CreateFormDto { Name = "Test Form" };
        var created = _formsService.CreateForm(dto, _testUserId);
        Assert.True(created.IsActive);

        // Act
        var updateDto = new UpdateFormDto { IsActive = false };
        var result = _formsService.UpdateForm(created.Id, updateDto, _testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsActive);
    }
}
