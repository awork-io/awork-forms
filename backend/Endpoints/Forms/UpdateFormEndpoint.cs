using Backend.Forms;
using System.Text.Json;

namespace Backend.Endpoints.Forms;

public class UpdateFormEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/forms/{id:int}", async (HttpContext context, FormsService formsService, int id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            try
            {
                using var requestBody = await JsonDocument.ParseAsync(context.Request.Body);
                var hasAworkAssigneeId = requestBody.RootElement.TryGetProperty("aworkAssigneeId", out _);
                var dto = requestBody.RootElement.Deserialize<UpdateFormDto>();
                if (dto == null) return Results.BadRequest(new { error = "Invalid request body" });

                var form = formsService.UpdateForm(id, dto, userId.Value, hasAworkAssigneeId);
                if (form == null) return Results.NotFound(new { error = "Form not found" });
                return Results.Ok(form);
            }
            catch (JsonException)
            {
                return Results.BadRequest(new { error = "Invalid JSON payload" });
            }
            catch (ValidationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        }).RequireAuth();
    }
}
