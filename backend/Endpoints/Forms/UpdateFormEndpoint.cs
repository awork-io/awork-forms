using Backend.Forms;

namespace Backend.Endpoints.Forms;

public class UpdateFormEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/forms/{id:int}", (HttpContext context, FormsService formsService, int id, UpdateFormDto dto) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            var form = formsService.UpdateForm(id, dto, userId.Value);
            if (form == null) return Results.NotFound(new { error = "Form not found" });

            return Results.Ok(form);
        }).RequireAuth();
    }
}
