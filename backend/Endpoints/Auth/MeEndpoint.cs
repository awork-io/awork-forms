using Backend.Auth;

namespace Backend.Endpoints.Auth;

public class MeEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/auth/me", async (HttpContext context, AuthService authService) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            var user = await authService.GetUserById(userId.Value);
            if (user == null) return Results.Unauthorized();

            return Results.Ok(new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                AvatarUrl = user.AvatarUrl,
                WorkspaceId = user.AworkWorkspaceId,
                WorkspaceName = user.WorkspaceName,
                WorkspaceUrl = user.WorkspaceUrl
            });
        }).RequireAuth();
    }
}
