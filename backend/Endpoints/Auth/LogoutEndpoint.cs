namespace Backend.Endpoints.Auth;

public class LogoutEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/logout", () => Results.Ok(new { message = "Logged out successfully" }));
    }
}
