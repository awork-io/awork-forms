namespace Backend.Endpoints.Config;

public class AppConfigEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/app-config", async context =>
        {
            var payload = new
            {
                sentryDsn = Environment.GetEnvironmentVariable("SENTRY_DSN") ?? string.Empty,
                sentryEnvironment = Environment.GetEnvironmentVariable("SENTRY_ENVIRONMENT") ?? string.Empty,
                sentryRelease = Environment.GetEnvironmentVariable("SENTRY_RELEASE") ?? string.Empty
            };

            context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
            await context.Response.WriteAsJsonAsync(payload);
        }).AllowAnonymous();
    }
}
