using Backend.Auth;
using Backend.Awork;
using Backend.Data;
using Backend.Endpoints;
using Backend.Forms;
using Backend.Submissions;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
            builder.Configuration["Frontend:Url"] ?? "http://localhost:5173"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

// Database - PostgreSQL in production, SQLite in development
var dbUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (!string.IsNullOrEmpty(dbUrl))
{
    builder.Services.AddDbContextFactory<AppDbContext>(options => options.UseNpgsql(dbUrl));
}
else
{
    var dataFolder = Path.Combine(builder.Environment.ContentRootPath, "Data");
    Directory.CreateDirectory(dataFolder);
    var connectionString = $"Data Source={Path.Combine(dataFolder, "awork-forms.db")}";
    builder.Services.AddDbContextFactory<AppDbContext>(options => options.UseSqlite(connectionString));
}

builder.Services.AddHttpClient();

// JWT
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"]
    ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
    ?? "awork-forms-dev-secret-key-change-in-production-min-32-chars";
builder.Services.AddSingleton(new JwtService(jwtSecretKey));

// Services
var frontendUrl = builder.Configuration["Frontend:Url"] ?? "http://localhost:5173";
var redirectUri = $"{frontendUrl}/auth/callback";

builder.Services.AddSingleton(sp => new AuthService(
    sp.GetRequiredService<IHttpClientFactory>().CreateClient(),
    sp.GetRequiredService<IDbContextFactory<AppDbContext>>(),
    sp.GetRequiredService<JwtService>(),
    redirectUri
));

builder.Services.AddSingleton(sp => new FormsService(
    sp.GetRequiredService<IDbContextFactory<AppDbContext>>()
));

builder.Services.AddSingleton(sp => new AworkApiService(
    sp.GetRequiredService<IHttpClientFactory>().CreateClient(),
    sp.GetRequiredService<IDbContextFactory<AppDbContext>>()
));

builder.Services.AddSingleton(sp => new SubmissionProcessor(
    sp.GetRequiredService<IDbContextFactory<AppDbContext>>(),
    sp.GetRequiredService<AworkApiService>()
));

var app = builder.Build();

// Apply migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IDbContextFactory<AppDbContext>>().CreateDbContext();
    db.Database.Migrate();
}

app.UseCors();

// Static files
app.UseDefaultFiles();
app.UseStaticFiles();

var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

// Auth middleware
app.UseJwtAuthentication(app.Services.GetRequiredService<JwtService>());

// Endpoints
app.MapEndpoints();

// SPA fallback
app.MapFallbackToFile("index.html");

app.Run();
