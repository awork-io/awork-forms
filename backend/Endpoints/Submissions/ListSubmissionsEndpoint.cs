using Backend.Forms;

namespace Backend.Endpoints.Submissions;

public class ListSubmissionsEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/submissions", (HttpContext context, FormsService formsService) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();
            return Results.Ok(formsService.GetSubmissionsByUser(userId.Value));
        }).RequireAuth();

        app.MapGet("/api/forms/{id:int}/submissions", (HttpContext context, FormsService formsService, int id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            var form = formsService.GetFormById(id, userId.Value);
            if (form == null) return Results.NotFound(new { error = "Form not found" });

            return Results.Ok(formsService.GetSubmissionsByForm(id, userId.Value));
        }).RequireAuth();
    }
}
