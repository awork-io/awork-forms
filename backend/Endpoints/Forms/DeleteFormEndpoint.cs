using Backend.Forms;

namespace Backend.Endpoints.Forms;

public class DeleteFormEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/forms/{id:int}", (HttpContext context, FormsService formsService, int id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            var deleted = formsService.DeleteForm(id, userId.Value);
            if (!deleted) return Results.NotFound(new { error = "Form not found" });

            return Results.Ok(new { message = "Form deleted successfully" });
        }).RequireAuth();
    }
}
