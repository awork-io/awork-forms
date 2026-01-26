using Backend.Forms;

namespace Backend.Endpoints.Forms;

public class PublicFormEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/f/{publicId:guid}", (FormsService formsService, Guid publicId) =>
        {
            var form = formsService.GetPublicFormByPublicId(publicId);
            if (form == null) return Results.NotFound(new { error = "Form not found" });
            if (!form.IsActive) return Results.NotFound(new { error = "This form is no longer accepting submissions" });
            return Results.Ok(form);
        });
    }
}
