using Backend.Auth;

namespace Backend.Endpoints.Auth;

public class LoginEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/auth/login", async (AuthService authService) =>
        {
            var result = await authService.InitiateAuth();
            return Results.Ok(new { authorizationUrl = result.AuthorizationUrl, state = result.State });
        });
    }
}
