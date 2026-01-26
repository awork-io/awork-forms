using Backend.Awork;

namespace Backend.Endpoints.Awork;

public class ProjectTypesEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/awork/projecttypes", async (HttpContext context, AworkApiService aworkService) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            try
            {
                return Results.Ok(await aworkService.GetProjectTypesAsync(userId.Value));
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

        app.MapGet("/api/awork/projecttypes/{id}/projectstatuses", async (HttpContext context, AworkApiService aworkService, string id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            try
            {
                return Results.Ok(await aworkService.GetProjectStatusesAsync(userId.Value, id));
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
