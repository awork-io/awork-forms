using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints.Health;

public class HealthEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/health", () => new { status = "healthy", timestamp = DateTime.UtcNow });

        app.MapGet("/api/db/info", async (AppDbContext db) =>
        {
            var canConnect = await db.Database.CanConnectAsync();
            var provider = db.Database.ProviderName;
            return new { canConnect, provider, timestamp = DateTime.UtcNow };
        });
    }
}
