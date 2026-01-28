using System.Security.Claims;

namespace Backend.Auth;

public static class AuthMiddleware
{
    /// <summary>
    /// Middleware that validates JWT tokens and sets HttpContext.User
    /// </summary>
    public static void UseJwtAuthentication(this WebApplication app, JwtService jwtService)
    {
        app.Use(async (context, next) =>
        {
            var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
            string? token = null;

            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
            {
                token = authHeader.Substring("Bearer ".Length);
            }
            else if (context.Request.Cookies.TryGetValue("awf_session", out var cookieToken))
            {
                token = cookieToken;
            }

            if (!string.IsNullOrEmpty(token))
            {
                var principal = jwtService.ValidateToken(token);

                if (principal != null)
                {
                    context.User = principal;
                }
            }

            await next(context);
        });
    }

    /// <summary>
    /// Extension method to require authentication on an endpoint
    /// </summary>
    public static RouteHandlerBuilder RequireAuth(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var user = context.HttpContext.User;
            var userId = JwtService.GetUserId(user);
            var workspaceId = JwtService.GetWorkspaceId(user);

            if (userId == null || workspaceId == null || workspaceId == Guid.Empty)
            {
                return Results.Unauthorized();
            }

            return await next(context);
        });
    }

    /// <summary>
    /// Gets the current user ID from HttpContext
    /// </summary>
    public static Guid? GetCurrentUserId(this HttpContext context)
    {
        return JwtService.GetUserId(context.User);
    }

    /// <summary>
    /// Gets the current workspace ID from HttpContext
    /// </summary>
    public static Guid? GetCurrentWorkspaceId(this HttpContext context)
    {
        return JwtService.GetWorkspaceId(context.User);
    }
}
