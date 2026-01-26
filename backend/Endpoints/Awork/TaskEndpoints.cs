using Backend.Awork;

namespace Backend.Endpoints.Awork;

public class TaskEndpoints : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/awork/projects/{id:guid}/taskstatuses", async (HttpContext context, AworkApiService aworkService, Guid id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            try
            {
                return Results.Ok(await aworkService.GetTaskStatuses(userId.Value, id));
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

        app.MapGet("/api/awork/projects/{id:guid}/tasklists", async (HttpContext context, AworkApiService aworkService, Guid id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            try
            {
                return Results.Ok(await aworkService.GetTaskLists(userId.Value, id));
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

        app.MapGet("/api/awork/typesofwork", async (HttpContext context, AworkApiService aworkService) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            try
            {
                return Results.Ok(await aworkService.GetTypesOfWork(userId.Value));
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
