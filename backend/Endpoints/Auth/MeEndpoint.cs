using Backend.Auth;

namespace Backend.Endpoints.Auth;

public class MeEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/auth/me", (HttpContext context, AuthService authService) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            var user = authService.GetUserById(userId.Value);
            if (user == null) return Results.Unauthorized();

            return Results.Ok(new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                AvatarUrl = user.AvatarUrl,
                WorkspaceId = user.AworkWorkspaceId
            });
        }).RequireAuth();
    }
}
