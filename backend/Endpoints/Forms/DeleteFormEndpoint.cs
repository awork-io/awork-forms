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

            var result = formsService.DeleteForm(id, userId.Value);
            return result switch
            {
                DeleteFormResult.Deleted => Results.Ok(new { message = "Form deleted successfully" }),
                DeleteFormResult.Forbidden => Results.StatusCode(StatusCodes.Status403Forbidden),
                _ => Results.NotFound(new { error = "Form not found" })
            };
        }).RequireAuth();
    }
}
