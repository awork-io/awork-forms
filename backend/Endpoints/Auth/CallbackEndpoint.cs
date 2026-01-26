using Backend.Auth;

namespace Backend.Endpoints.Auth;

public class CallbackEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/auth/callback", async (string code, string state, AuthService authService) =>
        {
            var result = await authService.HandleCallbackAsync(code, state);
            if (!result.Success)
            {
                return Results.BadRequest(new { error = result.Error });
            }
            return Results.Ok(new { token = result.SessionToken, user = result.User });
        });
    }
}
