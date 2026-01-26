using Backend.Forms;

namespace Backend.Endpoints.Forms;

public class GetFormEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/forms/{id:int}", (HttpContext context, FormsService formsService, int id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            var form = formsService.GetFormById(id, userId.Value);
            if (form == null) return Results.NotFound(new { error = "Form not found" });

            return Results.Ok(form);
        }).RequireAuth();
    }
}
