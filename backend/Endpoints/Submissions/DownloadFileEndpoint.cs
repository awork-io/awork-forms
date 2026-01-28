using Backend.Auth;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints.Submissions;

public class DownloadFileEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/files/{fileId:guid}", async (HttpContext context, AppDbContext db, Guid fileId) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            var workspaceId = await db.Users
                .Where(u => u.Id == userId.Value)
                .Select(u => u.AworkWorkspaceId)
                .FirstOrDefaultAsync();

            if (workspaceId == Guid.Empty) return Results.Unauthorized();

            var file = await db.FileUploads.FirstOrDefaultAsync(f => f.PublicId == fileId);
            if (file == null)
                return Results.NotFound();

            var ownsFile = await db.Forms.AnyAsync(f =>
                f.PublicId == file.FormPublicId && f.WorkspaceId == workspaceId);
            if (!ownsFile)
                return Results.NotFound();

            return Results.File(file.Data, file.ContentType, file.FileName);
        }).RequireAuth();
    }
}
