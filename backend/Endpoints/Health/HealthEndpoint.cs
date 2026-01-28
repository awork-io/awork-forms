using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints.Health;

public class HealthEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/health", () => new { status = "healthy", timestamp = DateTime.UtcNow });

        app.MapGet("/api/db/info", async context =>
        {
            var env = context.RequestServices.GetRequiredService<IHostEnvironment>();
            if (!env.IsDevelopment())
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }

            var dbFactory = context.RequestServices.GetRequiredService<IDbContextFactory<AppDbContext>>();
            await using var db = await dbFactory.CreateDbContextAsync();
            var canConnect = await db.Database.CanConnectAsync();
            var provider = db.Database.ProviderName;
            await context.Response.WriteAsJsonAsync(new { canConnect, provider, timestamp = DateTime.UtcNow });
        });
    }
}
