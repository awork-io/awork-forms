namespace Backend.Endpoints.Auth;

public class LogoutEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/logout", (HttpContext context) =>
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = context.Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(-1),
                Path = "/"
            };
            context.Response.Cookies.Append("awf_session", string.Empty, cookieOptions);

            return Results.Ok(new { message = "Logged out successfully" });
        });
    }
}
