using Backend.Auth;
using Backend.Awork;
using Backend.Database;
using Backend.Forms;
using Backend.Submissions;

var builder = WebApplication.CreateBuilder(args);

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure SQLite database
var dataFolder = Path.Combine(builder.Environment.ContentRootPath, "Data");
Directory.CreateDirectory(dataFolder);
var connectionString = $"Data Source={Path.Combine(dataFolder, "awork-forms.db")}";

// Register DbContextFactory as singleton
builder.Services.AddSingleton(new DbContextFactory(connectionString));

// Configure HttpClient for awork API calls
builder.Services.AddHttpClient();

// Configure JWT service
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] ??
    Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ??
    "awork-forms-dev-secret-key-change-in-production-min-32-chars";

builder.Services.AddSingleton(new JwtService(jwtSecretKey));

// Configure AuthService (uses DCR for dynamic client registration)
var frontendUrl = builder.Configuration["Frontend:Url"] ?? "http://localhost:5173";
var redirectUri = $"{frontendUrl}/auth/callback";

builder.Services.AddSingleton(sp =>
{
    var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
    var dbFactory = sp.GetRequiredService<DbContextFactory>();
    var jwtService = sp.GetRequiredService<JwtService>();
    return new AuthService(httpClientFactory.CreateClient(), dbFactory, jwtService, redirectUri);
});

// Configure FormsService
builder.Services.AddSingleton(sp =>
{
    var dbFactory = sp.GetRequiredService<DbContextFactory>();
    return new FormsService(dbFactory);
});

// Configure AworkApiService (uses DCR client_id from database)
builder.Services.AddSingleton(sp =>
{
    var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
    var dbFactory = sp.GetRequiredService<DbContextFactory>();
    return new AworkApiService(httpClientFactory.CreateClient(), dbFactory);
});

// Configure SubmissionProcessor
builder.Services.AddSingleton(sp =>
{
    var dbFactory = sp.GetRequiredService<DbContextFactory>();
    var aworkService = sp.GetRequiredService<AworkApiService>();
    return new SubmissionProcessor(dbFactory, aworkService);
});

var app = builder.Build();

// Run database migrations on startup
Console.WriteLine("Running database migrations...");
DatabaseMigrator.Migrate(connectionString);
Console.WriteLine("Database migrations completed.");

// Use CORS
app.UseCors();

// Use JWT authentication middleware
var jwtService = app.Services.GetRequiredService<JwtService>();
app.UseJwtAuthentication(jwtService);

// Health check endpoint
app.MapGet("/api/health", () => new { status = "healthy", timestamp = DateTime.UtcNow });

// Database info endpoint (for verification)
app.MapGet("/api/db/info", (DbContextFactory dbFactory) =>
{
    using var ctx = dbFactory.CreateContext();
    using var cmd = ctx.Connection.CreateCommand();

    // Get list of tables
    cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
    var tables = new List<string>();
    using var reader = cmd.ExecuteReader();
    while (reader.Read())
    {
        tables.Add(reader.GetString(0));
    }

    return new {
        database = "awork-forms.db",
        tables = tables,
        connectionString = dbFactory.ConnectionString
    };
});

// Root endpoint
app.MapGet("/", () => "awork Forms API");

// =====================
// Auth Endpoints
// =====================

// Initiate OAuth flow - returns authorization URL
app.MapGet("/api/auth/login", async (AuthService authService) =>
{
    var result = await authService.InitiateAuthAsync();
    return Results.Ok(new
    {
        authorizationUrl = result.AuthorizationUrl,
        state = result.State
    });
});

// OAuth callback - exchanges code for tokens
app.MapGet("/api/auth/callback", async (string code, string state, AuthService authService) =>
{
    var result = await authService.HandleCallbackAsync(code, state);

    if (!result.Success)
    {
        return Results.BadRequest(new { error = result.Error });
    }

    return Results.Ok(new
    {
        token = result.SessionToken,
        user = result.User
    });
});

// Get current user info (requires auth)
app.MapGet("/api/auth/me", (HttpContext context, AuthService authService) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null)
    {
        return Results.Unauthorized();
    }

    var user = authService.GetUserById(userId.Value);
    if (user == null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new UserDto
    {
        Id = user.Id,
        Email = user.Email,
        Name = user.Name,
        AvatarUrl = user.AvatarUrl,
        WorkspaceId = user.AworkWorkspaceId
    });
}).RequireAuth();

// Logout (client-side only - just clears the token)
app.MapPost("/api/auth/logout", () =>
{
    // JWT tokens are stateless, so logout is handled client-side
    // In the future, we could implement token blacklisting
    return Results.Ok(new { message = "Logged out successfully" });
});

// Test login endpoint (for development/testing only)
app.MapGet("/api/auth/test-login", (DbContextFactory dbFactory, JwtService jwtService) =>
{
    // Create or get test user
    using var ctx = dbFactory.CreateContext();
    using var cmd = ctx.Connection.CreateCommand();

    cmd.CommandText = "SELECT Id FROM Users WHERE Email = 'test@example.com'";
    var existingId = cmd.ExecuteScalar();
    int userId;

    if (existingId == null)
    {
        using var insertCmd = ctx.Connection.CreateCommand();
        insertCmd.CommandText = @"
            INSERT INTO Users (Email, Name, AworkUserId, AworkWorkspaceId, CreatedAt, UpdatedAt)
            VALUES ('test@example.com', 'Test User', 'test-awork-id', 'test-workspace', @now, @now);
            SELECT last_insert_rowid();";
        insertCmd.Parameters.AddWithValue("@now", DateTime.UtcNow.ToString("o"));
        userId = Convert.ToInt32(insertCmd.ExecuteScalar());
    }
    else
    {
        userId = Convert.ToInt32(existingId);
    }

    var token = jwtService.GenerateToken(userId, "test-awork-id", "test-workspace");

    return Results.Ok(new
    {
        token = token,
        user = new UserDto
        {
            Id = userId,
            Email = "test@example.com",
            Name = "Test User",
            WorkspaceId = "test-workspace"
        }
    });
});

// =====================
// Forms Endpoints
// =====================

// GET /api/forms - List all forms for current user
app.MapGet("/api/forms", (HttpContext context, FormsService formsService) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    var forms = formsService.GetFormsByUser(userId.Value);
    return Results.Ok(forms);
}).RequireAuth();

// POST /api/forms - Create a new form
app.MapPost("/api/forms", (HttpContext context, FormsService formsService, CreateFormDto dto) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(dto.Name))
    {
        return Results.BadRequest(new { error = "Form name is required" });
    }

    var form = formsService.CreateForm(dto, userId.Value);
    return Results.Created($"/api/forms/{form.Id}", form);
}).RequireAuth();

// GET /api/forms/{id} - Get a specific form
app.MapGet("/api/forms/{id:int}", (HttpContext context, FormsService formsService, int id) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    var form = formsService.GetFormById(id, userId.Value);
    if (form == null)
    {
        return Results.NotFound(new { error = "Form not found" });
    }

    return Results.Ok(form);
}).RequireAuth();

// PUT /api/forms/{id} - Update a form
app.MapPut("/api/forms/{id:int}", (HttpContext context, FormsService formsService, int id, UpdateFormDto dto) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    var form = formsService.UpdateForm(id, dto, userId.Value);
    if (form == null)
    {
        return Results.NotFound(new { error = "Form not found" });
    }

    return Results.Ok(form);
}).RequireAuth();

// DELETE /api/forms/{id} - Delete a form
app.MapDelete("/api/forms/{id:int}", (HttpContext context, FormsService formsService, int id) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    var deleted = formsService.DeleteForm(id, userId.Value);
    if (!deleted)
    {
        return Results.NotFound(new { error = "Form not found" });
    }

    return Results.Ok(new { message = "Form deleted successfully" });
}).RequireAuth();

// =====================
// awork API Proxy Endpoints
// =====================

// GET /api/awork/projects - List all projects from awork
app.MapGet("/api/awork/projects", async (HttpContext context, AworkApiService aworkService) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    try
    {
        var projects = await aworkService.GetProjectsAsync(userId.Value);
        return Results.Ok(projects);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Results.Json(new { error = ex.Message, code = "TOKEN_EXPIRED" }, statusCode: 401);
    }
    catch (HttpRequestException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 502);
    }
}).RequireAuth();

// GET /api/awork/projecttypes - List all project types from awork
app.MapGet("/api/awork/projecttypes", async (HttpContext context, AworkApiService aworkService) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    try
    {
        var projectTypes = await aworkService.GetProjectTypesAsync(userId.Value);
        return Results.Ok(projectTypes);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Results.Json(new { error = ex.Message, code = "TOKEN_EXPIRED" }, statusCode: 401);
    }
    catch (HttpRequestException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 502);
    }
}).RequireAuth();

// GET /api/awork/users - List all users from awork workspace
app.MapGet("/api/awork/users", async (HttpContext context, AworkApiService aworkService) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    try
    {
        var users = await aworkService.GetUsersAsync(userId.Value);
        return Results.Ok(users);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Results.Json(new { error = ex.Message, code = "TOKEN_EXPIRED" }, statusCode: 401);
    }
    catch (HttpRequestException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 502);
    }
}).RequireAuth();

// GET /api/awork/projecttypes/{id}/projectstatuses - Get project statuses for a project type
app.MapGet("/api/awork/projecttypes/{id}/projectstatuses", async (HttpContext context, AworkApiService aworkService, string id) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    try
    {
        var statuses = await aworkService.GetProjectStatusesAsync(userId.Value, id);
        return Results.Ok(statuses);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Results.Json(new { error = ex.Message, code = "TOKEN_EXPIRED" }, statusCode: 401);
    }
    catch (HttpRequestException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 502);
    }
}).RequireAuth();

// GET /api/awork/projects/{id}/taskstatuses - Get task statuses for a project
app.MapGet("/api/awork/projects/{id}/taskstatuses", async (HttpContext context, AworkApiService aworkService, string id) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    try
    {
        var statuses = await aworkService.GetTaskStatusesAsync(userId.Value, id);
        return Results.Ok(statuses);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Results.Json(new { error = ex.Message, code = "TOKEN_EXPIRED" }, statusCode: 401);
    }
    catch (HttpRequestException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 502);
    }
}).RequireAuth();

// GET /api/awork/projects/{id}/tasklists - Get task lists for a project
app.MapGet("/api/awork/projects/{id}/tasklists", async (HttpContext context, AworkApiService aworkService, string id) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    try
    {
        var lists = await aworkService.GetTaskListsAsync(userId.Value, id);
        return Results.Ok(lists);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Results.Json(new { error = ex.Message, code = "TOKEN_EXPIRED" }, statusCode: 401);
    }
    catch (HttpRequestException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 502);
    }
}).RequireAuth();

// GET /api/awork/typesofwork - Get all types of work
app.MapGet("/api/awork/typesofwork", async (HttpContext context, AworkApiService aworkService) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    try
    {
        var types = await aworkService.GetTypesOfWorkAsync(userId.Value);
        return Results.Ok(types);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Results.Json(new { error = ex.Message, code = "TOKEN_EXPIRED" }, statusCode: 401);
    }
    catch (HttpRequestException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: 502);
    }
}).RequireAuth();

// =====================
// Logo Upload Endpoint
// =====================

// Create uploads directory path
var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);

// Serve static files from uploads directory
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

// POST /api/forms/{id}/logo - Upload a logo for a form
app.MapPost("/api/forms/{id:int}/logo", async (HttpContext context, FormsService formsService, int id) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    // Verify form exists and belongs to user
    var form = formsService.GetFormById(id, userId.Value);
    if (form == null)
    {
        return Results.NotFound(new { error = "Form not found" });
    }

    // Check if request has a file
    if (!context.Request.HasFormContentType)
    {
        return Results.BadRequest(new { error = "Request must be multipart/form-data" });
    }

    var formFile = context.Request.Form.Files.GetFile("logo");
    if (formFile == null || formFile.Length == 0)
    {
        return Results.BadRequest(new { error = "No file uploaded" });
    }

    // Validate file type (only allow images)
    var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg" };
    var extension = Path.GetExtension(formFile.FileName).ToLowerInvariant();
    if (!allowedExtensions.Contains(extension))
    {
        return Results.BadRequest(new { error = "Invalid file type. Allowed: jpg, jpeg, png, gif, webp, svg" });
    }

    // Validate file size (max 5MB)
    if (formFile.Length > 5 * 1024 * 1024)
    {
        return Results.BadRequest(new { error = "File size must be less than 5MB" });
    }

    // Generate unique filename
    var fileName = $"{form.PublicId}-logo{extension}";
    var filePath = Path.Combine(uploadsPath, fileName);

    // Delete old logo if exists
    if (!string.IsNullOrEmpty(form.LogoUrl))
    {
        var oldFileName = Path.GetFileName(form.LogoUrl);
        var oldFilePath = Path.Combine(uploadsPath, oldFileName);
        if (File.Exists(oldFilePath))
        {
            File.Delete(oldFilePath);
        }
    }

    // Save new file
    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await formFile.CopyToAsync(stream);
    }

    // Update form with logo URL
    var logoUrl = $"/uploads/{fileName}";
    formsService.UpdateForm(id, new UpdateFormDto { LogoUrl = logoUrl }, userId.Value);

    return Results.Ok(new { logoUrl });
}).RequireAuth().DisableAntiforgery();

// DELETE /api/forms/{id}/logo - Remove logo from a form
app.MapDelete("/api/forms/{id:int}/logo", (HttpContext context, FormsService formsService, int id) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    // Verify form exists and belongs to user
    var form = formsService.GetFormById(id, userId.Value);
    if (form == null)
    {
        return Results.NotFound(new { error = "Form not found" });
    }

    // Delete logo file if exists
    if (!string.IsNullOrEmpty(form.LogoUrl))
    {
        var fileName = Path.GetFileName(form.LogoUrl);
        var filePath = Path.Combine(uploadsPath, fileName);
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }
    }

    // Clear logo URL from form
    formsService.UpdateForm(id, new UpdateFormDto { LogoUrl = "" }, userId.Value);

    return Results.Ok(new { message = "Logo removed successfully" });
}).RequireAuth();

// =====================
// Public Form Endpoints (No Auth Required)
// =====================

// GET /api/f/{publicId} - Get a public form by its public ID
app.MapGet("/api/f/{publicId:guid}", (FormsService formsService, Guid publicId) =>
{
    var form = formsService.GetPublicFormByPublicId(publicId);

    if (form == null)
    {
        return Results.NotFound(new { error = "Form not found" });
    }

    if (!form.IsActive)
    {
        return Results.NotFound(new { error = "This form is no longer accepting submissions" });
    }

    return Results.Ok(form);
});

// =====================
// Submissions Endpoints
// =====================

// GET /api/submissions - List all submissions for current user (across all forms)
app.MapGet("/api/submissions", (HttpContext context, FormsService formsService) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    var submissions = formsService.GetSubmissionsByUser(userId.Value);
    return Results.Ok(submissions);
}).RequireAuth();

// GET /api/forms/{id}/submissions - List submissions for a specific form
app.MapGet("/api/forms/{id:int}/submissions", (HttpContext context, FormsService formsService, int id) =>
{
    var userId = context.GetCurrentUserId();
    if (userId == null) return Results.Unauthorized();

    // Verify form exists and belongs to user
    var form = formsService.GetFormById(id, userId.Value);
    if (form == null)
    {
        return Results.NotFound(new { error = "Form not found" });
    }

    var submissions = formsService.GetSubmissionsByForm(id, userId.Value);
    return Results.Ok(submissions);
}).RequireAuth();

// POST /api/f/{publicId}/submit - Submit data to a public form
app.MapPost("/api/f/{publicId:guid}/submit", async (FormsService formsService, SubmissionProcessor processor, Guid publicId, CreateSubmissionDto dto) =>
{
    var form = formsService.GetPublicFormByPublicId(publicId);

    if (form == null)
    {
        return Results.NotFound(new { error = "Form not found" });
    }

    if (!form.IsActive)
    {
        return Results.BadRequest(new { error = "This form is no longer accepting submissions" });
    }

    // Convert data to JSON string
    var dataJson = System.Text.Json.JsonSerializer.Serialize(dto.Data);

    // Create the submission record
    var submission = formsService.CreateSubmission(form.Id, dataJson);

    // Process the submission (create awork task/project if configured)
    var processResult = await processor.ProcessSubmissionAsync(submission.Id);

    // Return appropriate response based on processing result
    if (processResult.Status == "completed")
    {
        return Results.Created($"/api/submissions/{submission.Id}", new
        {
            success = true,
            message = "Thank you for your submission!",
            submissionId = submission.Id,
            aworkProjectId = processResult.AworkProjectId,
            aworkTaskId = processResult.AworkTaskId
        });
    }
    else
    {
        // Still return success to user even if awork integration failed
        // The submission was recorded; awork integration can be retried
        return Results.Created($"/api/submissions/{submission.Id}", new
        {
            success = true,
            message = "Thank you for your submission!",
            submissionId = submission.Id,
            integrationStatus = processResult.Status,
            integrationError = processResult.ErrorMessage
        });
    }
});

app.Run();
