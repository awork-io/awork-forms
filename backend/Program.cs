using Backend.Database;

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

var app = builder.Build();

// Run database migrations on startup
Console.WriteLine("Running database migrations...");
DatabaseMigrator.Migrate(connectionString);
Console.WriteLine("Database migrations completed.");

// Use CORS
app.UseCors();

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

app.Run();
