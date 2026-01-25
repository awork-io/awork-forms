using Backend.Auth;
using Backend.Awork;
using Backend.Database;
using Backend.Forms;

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

// GET /api/awork/types-of-work - Get all types of work
app.MapGet("/api/awork/types-of-work", async (HttpContext context, AworkApiService aworkService) =>
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

app.Run();
