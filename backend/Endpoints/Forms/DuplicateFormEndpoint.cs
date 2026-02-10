using Backend.Forms;

namespace Backend.Endpoints.Forms;

public class DuplicateFormEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/forms/{id:int}/duplicate", (HttpContext context, FormsService formsService, int id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            var duplicated = formsService.DuplicateForm(id, userId.Value);
            if (duplicated == null) return Results.NotFound(new { error = "Form not found" });

            return Results.Created($"/api/forms/{duplicated.Id}", duplicated);
        }).RequireAuth();
    }
}
