using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints.Auth;

public static class ResetDcrEndpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/auth/reset-dcr", async (IDbContextFactory<AppDbContext> dbFactory) =>
        {
            await using var db = await dbFactory.CreateDbContextAsync();
            var setting = await db.Settings.FirstOrDefaultAsync(s => s.Key == "dcr_client_id");
            
            if (setting != null)
            {
                db.Settings.Remove(setting);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "DCR client reset. Next login will register a new client." });
            }
            
            return Results.Ok(new { message = "No DCR client found to reset." });
        }).RequireAuthorization();
    }
}
