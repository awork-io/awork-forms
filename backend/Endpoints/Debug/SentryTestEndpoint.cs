namespace Backend.Endpoints.Debug;

public class SentryTestEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/debug/sentry-test", () =>
        {
            throw new InvalidOperationException("Sentry test exception from backend");
        }).RequireAuth();
    }
}
