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

        app.MapGet("/api/awork/projects/{id:guid}/projectstatuses", async (HttpContext context, AworkApiService aworkService, Guid id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            try
            {
                return Results.Ok(await aworkService.GetProjectStatuses(userId.Value, id));
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
