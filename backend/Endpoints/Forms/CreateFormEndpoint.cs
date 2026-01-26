using Backend.Forms;

namespace Backend.Endpoints.Forms;

public class CreateFormEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/forms", (HttpContext context, FormsService formsService, CreateFormDto dto) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Name))
                return Results.BadRequest(new { error = "Form name is required" });

            var form = formsService.CreateForm(dto, userId.Value);
            return Results.Created($"/api/forms/{form.Id}", form);
        }).RequireAuth();
    }
}
