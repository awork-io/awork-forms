using System.Text.Json;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints.Awork;

public record TrackRequest(
    string EventName,
    Dictionary<string, object>? Data,
    TrackContext? Context
);

public record TrackContext(
    string? UserAgent,
    string? Locale,
    TrackPage? Page
);

public record TrackPage(
    string? Path,
    string? Title,
    string? Url,
    string? Referrer
);

public class TrackEndpoint : IEndpoint
{
    private const string AworkTrackUrl = "https://api.awork.com/api/v1/track";

    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/awork/track", async (
            HttpContext context,
            TrackRequest request,
            IDbContextFactory<AppDbContext> dbFactory,
            HttpClient httpClient) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            await using var db = await dbFactory.CreateDbContextAsync();
            var user = await db.Users.FindAsync(userId.Value);

            if (user?.AccessToken == null)
                return Results.Unauthorized();

            try
            {
                var payload = new
                {
                    eventName = request.EventName,
                    data = request.Data ?? new Dictionary<string, object>(),
                    context = new
                    {
                        userAgent = request.Context?.UserAgent ?? context.Request.Headers.UserAgent.ToString(),
                        locale = request.Context?.Locale ?? "en",
                        page = new
                        {
                            path = request.Context?.Page?.Path ?? "/",
                            title = request.Context?.Page?.Title ?? "awork Forms",
                            url = request.Context?.Page?.Url ?? "",
                            referrer = request.Context?.Page?.Referrer ?? ""
                        }
                    }
                };

                var httpRequest = new HttpRequestMessage(HttpMethod.Post, AworkTrackUrl);
                httpRequest.Headers.Add("Authorization", $"Bearer {user.AccessToken}");
                httpRequest.Content = new StringContent(
                    JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }),
                    System.Text.Encoding.UTF8,
                    "application/json"
                );

                var response = await httpClient.SendAsync(httpRequest);
                return response.IsSuccessStatusCode
                    ? Results.Ok(new { success = true })
                    : Results.StatusCode((int)response.StatusCode);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Track event failed: {ex.Message}");
                return Results.StatusCode(500);
            }
        }).RequireAuth();
    }
}
