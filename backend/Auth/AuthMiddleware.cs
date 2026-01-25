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

            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
            {
                var token = authHeader.Substring("Bearer ".Length);
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

            if (userId == null)
            {
                return Results.Unauthorized();
            }

            return await next(context);
        });
    }

    /// <summary>
    /// Gets the current user ID from HttpContext
    /// </summary>
    public static int? GetCurrentUserId(this HttpContext context)
    {
        return JwtService.GetUserId(context.User);
    }

    /// <summary>
    /// Gets the current workspace ID from HttpContext
    /// </summary>
    public static string? GetCurrentWorkspaceId(this HttpContext context)
    {
        return JwtService.GetWorkspaceId(context.User);
    }
}
