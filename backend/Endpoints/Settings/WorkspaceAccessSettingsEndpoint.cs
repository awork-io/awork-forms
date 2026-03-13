using Backend.WorkspaceAccess;

namespace Backend.Endpoints.Settings;

public class WorkspaceAccessSettingsEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/settings/workspace-access", async (HttpContext context, WorkspaceAccessService workspaceAccessService) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            try
            {
                return Results.Ok(await workspaceAccessService.GetSettings(userId.Value));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status403Forbidden);
            }
        }).RequireAuth();

        app.MapPut("/api/settings/workspace-access", async (
            HttpContext context,
            UpdateWorkspaceAccessSettingsRequest request,
            WorkspaceAccessService workspaceAccessService) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            try
            {
                return Results.Ok(await workspaceAccessService.UpdateSettings(userId.Value, request));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status403Forbidden);
            }
        }).RequireAuth();
    }
}
