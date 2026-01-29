using System.Threading.RateLimiting;
using Backend.Auth;
using Backend.Awork;
using Backend.Data;
using Backend.Endpoints;
using Backend.Forms;
using Backend.Submissions;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var enableCors = builder.Environment.IsDevelopment() ||
    string.Equals(builder.Configuration["Cors:Enabled"] ?? Environment.GetEnvironmentVariable("CORS_ENABLED"), "true", StringComparison.OrdinalIgnoreCase);
if (enableCors)
{
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
}

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
    ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY");
if (string.IsNullOrWhiteSpace(jwtSecretKey) || jwtSecretKey.Length < 32)
{
    throw new InvalidOperationException("JWT_SECRET_KEY is required and must be at least 32 characters.");
}
var defaultExpirationDays = builder.Environment.IsDevelopment() ? 7 : 1;
var jwtExpirationDays = int.TryParse(
    builder.Configuration["Jwt:ExpirationDays"] ?? Environment.GetEnvironmentVariable("JWT_EXPIRATION_DAYS"),
    out var parsedDays)
    ? parsedDays
    : defaultExpirationDays;
builder.Services.AddSingleton(new JwtService(jwtSecretKey, expirationDays: jwtExpirationDays));

// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 1000,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 10
            }));

    options.AddPolicy("public", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
});

// Services
var frontendUrl = Environment.GetEnvironmentVariable("BASE_URL") 
    ?? builder.Configuration["Frontend:Url"] 
    ?? "http://localhost:5173";
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

var forwardedOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};
forwardedOptions.KnownNetworks.Clear();
forwardedOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedOptions);

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
    context.Response.Headers["X-XSS-Protection"] = "0";

    if (!app.Environment.IsDevelopment())
    {
        context.Response.Headers["Content-Security-Policy"] =
            "default-src 'self'; " +
            "base-uri 'self'; " +
            "object-src 'none'; " +
            "frame-ancestors 'none'; " +
            "img-src 'self' data: https:; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "connect-src 'self' https://api.awork.com;";
    }

    await next();
});

// Apply migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IDbContextFactory<AppDbContext>>().CreateDbContext();
    db.Database.Migrate();
}

if (enableCors)
{
    app.UseCors();
}
app.UseRateLimiter();

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
