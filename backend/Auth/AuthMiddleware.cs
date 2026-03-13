using System.Security.Claims;
using Sentry;

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

                    SentrySdk.ConfigureScope(scope =>
                    {
                        var userId = JwtService.GetUserId(principal);
                        var aworkUserId = JwtService.GetAworkUserId(principal);
                        var workspaceId = JwtService.GetWorkspaceId(principal);

                        scope.User = new Sentry.SentryUser
                        {
                            Id = userId?.ToString(),
                            Other = new Dictionary<string, string>
                            {
                                ["awork_user_id"] = aworkUserId?.ToString() ?? "",
                                ["workspace_id"] = workspaceId?.ToString() ?? ""
                            }
                        };
                    });
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
            var httpContext = context.HttpContext;
            var user = httpContext.User;
            var userId = JwtService.GetUserId(user);
            var workspaceId = JwtService.GetWorkspaceId(user);

            if (userId == null || workspaceId == null || workspaceId == Guid.Empty)
            {
                return Results.Unauthorized();
            }

            var path = httpContext.Request.Path.Value ?? string.Empty;
            var isAuthStatusRoute =
                string.Equals(path, "/api/auth/me", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(path, "/api/auth/logout", StringComparison.OrdinalIgnoreCase);

            if (!isAuthStatusRoute)
            {
                var workspaceAccessService = httpContext.RequestServices.GetRequiredService<Backend.WorkspaceAccess.WorkspaceAccessService>();
                var hasFormsAccess = await workspaceAccessService.HasFormsAccess(userId.Value);
                if (!hasFormsAccess)
                {
                    return Results.Json(
                        new { error = "Forms access denied.", code = "FORMS_ACCESS_DENIED" },
                        statusCode: StatusCodes.Status403Forbidden);
                }
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
