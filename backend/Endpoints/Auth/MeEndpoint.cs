using Backend.Auth;
using Backend.WorkspaceAccess;

namespace Backend.Endpoints.Auth;

public class MeEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/auth/me", async (HttpContext context, AuthService authService, WorkspaceAccessService workspaceAccessService) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            await authService.RefreshWorkspaceAccessPermission(userId.Value);

            var user = await workspaceAccessService.GetUserDto(userId.Value);
            if (user == null) return Results.Unauthorized();

            return Results.Ok(user);
        }).RequireAuth();
    }
}
