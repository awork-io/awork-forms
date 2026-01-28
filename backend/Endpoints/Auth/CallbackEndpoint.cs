using Backend.Auth;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Endpoints.Auth;

public class CallbackEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/auth/callback", async (HttpContext context, string code, string state, AuthService authService, JwtService jwtService) =>
        {
            var result = await authService.HandleCallback(code, state);
            if (!result.Success)
            {
                return Results.BadRequest(new { error = result.Error });
            }

            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = !context.Request.IsHttps ? false : true,
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddDays(jwtService.ExpirationDays),
                Path = "/"
            };
            context.Response.Cookies.Append("awf_session", result.SessionToken!, cookieOptions);

            return Results.Ok(new { user = result.User });
        }).RequireRateLimiting("auth");
    }
}
