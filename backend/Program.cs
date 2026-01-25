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

// Configure AuthService
var frontendUrl = builder.Configuration["Frontend:Url"] ?? "http://localhost:5173";
var redirectUri = $"{frontendUrl}/auth/callback";
var aworkClientId = builder.Configuration["Awork:ClientId"] ?? Environment.GetEnvironmentVariable("AWORK_CLIENT_ID");
var aworkClientSecret = builder.Configuration["Awork:ClientSecret"] ?? Environment.GetEnvironmentVariable("AWORK_CLIENT_SECRET");

builder.Services.AddSingleton(sp =>
{
    var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
    var dbFactory = sp.GetRequiredService<DbContextFactory>();
    var jwtService = sp.GetRequiredService<JwtService>();
    return new AuthService(httpClientFactory.CreateClient(), dbFactory, jwtService, redirectUri, aworkClientId, aworkClientSecret);
});

// Configure FormsService
builder.Services.AddSingleton(sp =>
{
    var dbFactory = sp.GetRequiredService<DbContextFactory>();
    return new FormsService(dbFactory);
});

// Configure AworkApiService
builder.Services.AddSingleton(sp =>
{
    var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
    var dbFactory = sp.GetRequiredService<DbContextFactory>();
    return new AworkApiService(httpClientFactory.CreateClient(), dbFactory, aworkClientId, aworkClientSecret);
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

// GET /api/awork/project-types - List all project types from awork
app.MapGet("/api/awork/project-types", async (HttpContext context, AworkApiService aworkService) =>
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

// GET /api/awork/project-types/{id}/statuses - Get project statuses for a project type
app.MapGet("/api/awork/project-types/{id}/statuses", async (HttpContext context, AworkApiService aworkService, string id) =>
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

// GET /api/awork/projects/{id}/task-statuses - Get task statuses for a project
app.MapGet("/api/awork/projects/{id}/task-statuses", async (HttpContext context, AworkApiService aworkService, string id) =>
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

// Test endpoint for visual verification (only in development)
if (app.Environment.IsDevelopment())
{
    app.MapGet("/api/auth/test-login", (DbContextFactory dbFactory, JwtService jwtService) =>
    {
        using var ctx = dbFactory.CreateContext();

        // Create or get test user
        var testEmail = "test@awork-forms.dev";
        using var checkCmd = ctx.Connection.CreateCommand();
        checkCmd.CommandText = "SELECT Id, Email, Name, AvatarUrl, AworkWorkspaceId FROM Users WHERE Email = @email";
        var emailParam = checkCmd.CreateParameter();
        emailParam.ParameterName = "@email";
        emailParam.Value = testEmail;
        checkCmd.Parameters.Add(emailParam);

        int userId;
        string? avatarUrl = null;

        using var reader = checkCmd.ExecuteReader();
        if (reader.Read())
        {
            userId = reader.GetInt32(0);
            avatarUrl = reader.IsDBNull(3) ? null : reader.GetString(3);
        }
        else
        {
            reader.Close();
            // Create test user
            using var insertCmd = ctx.Connection.CreateCommand();
            insertCmd.CommandText = @"
                INSERT INTO Users (Email, Name, AworkUserId, AworkWorkspaceId, CreatedAt, UpdatedAt)
                VALUES (@email, @name, @aworkUserId, @workspaceId, @now, @now);
                SELECT last_insert_rowid();";

            var p1 = insertCmd.CreateParameter(); p1.ParameterName = "@email"; p1.Value = testEmail; insertCmd.Parameters.Add(p1);
            var p2 = insertCmd.CreateParameter(); p2.ParameterName = "@name"; p2.Value = "Test User"; insertCmd.Parameters.Add(p2);
            var p3 = insertCmd.CreateParameter(); p3.ParameterName = "@aworkUserId"; p3.Value = "test-awork-user-id"; insertCmd.Parameters.Add(p3);
            var p4 = insertCmd.CreateParameter(); p4.ParameterName = "@workspaceId"; p4.Value = "test-workspace"; insertCmd.Parameters.Add(p4);
            var p5 = insertCmd.CreateParameter(); p5.ParameterName = "@now"; p5.Value = DateTime.UtcNow.ToString("o"); insertCmd.Parameters.Add(p5);

            userId = Convert.ToInt32(insertCmd.ExecuteScalar());
        }

        // Generate JWT token
        var token = jwtService.GenerateToken(userId, "test-awork-user-id", "test-workspace");

        return Results.Ok(new
        {
            token = token,
            user = new UserDto
            {
                Id = userId,
                Email = testEmail,
                Name = "Test User",
                AvatarUrl = avatarUrl,
                WorkspaceId = "test-workspace"
            }
        });
    });
}

app.Run();
