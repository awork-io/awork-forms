using Backend.Forms;

namespace Backend.Endpoints.Forms;

public class ListFormsEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/forms", (HttpContext context, FormsService formsService) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();
            return Results.Ok(formsService.GetFormsByUser(userId.Value));
        }).RequireAuth();
    }
}
