using Backend.Awork;

namespace Backend.Endpoints.Awork;

public class ProjectsEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/awork/projects", async (HttpContext context, AworkApiService aworkService) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            try
            {
                var projects = await aworkService.GetProjects(userId.Value);
                return Results.Ok(projects);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Results.Json(new { error = ex.Message, code = "TOKEN_EXPIRED" }, statusCode: 401);
            }
            catch (HttpRequestException ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 502);
            }
        }).RequireAuth();
    }
}
