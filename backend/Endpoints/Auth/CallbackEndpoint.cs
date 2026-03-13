using Backend.Auth;
using Microsoft.AspNetCore.RateLimiting;
using Backend.WorkspaceAccess;

namespace Backend.Endpoints.Auth;

public class CallbackEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/auth/callback", async (
            HttpContext context,
            string code,
            string state,
            AuthService authService,
            JwtService jwtService,
            WorkspaceAccessService workspaceAccessService,
            IHostEnvironment env,
            IConfiguration config) =>
        {
            var result = await authService.HandleCallback(code, state);
            if (!result.Success || result.User == null)
            {
                return Results.BadRequest(new { error = result.Error });
            }

            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = context.Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(jwtService.ExpirationDays),
                Path = "/"
            };
            context.Response.Cookies.Append("awf_session", result.SessionToken!, cookieOptions);

            var exposeToken = env.IsDevelopment() ||
                              string.Equals(config["Auth:ExposeToken"] ?? Environment.GetEnvironmentVariable("AUTH_EXPOSE_TOKEN"), "true", StringComparison.OrdinalIgnoreCase);

            var userDto = await workspaceAccessService.GetUserDto(result.User.Id);
            if (userDto == null)
            {
                return Results.BadRequest(new { error = "Authentication failed" });
            }

            return exposeToken
                ? Results.Ok(new { user = userDto, token = result.SessionToken })
                : Results.Ok(new { user = userDto });
        }).RequireRateLimiting("auth");
    }
}
