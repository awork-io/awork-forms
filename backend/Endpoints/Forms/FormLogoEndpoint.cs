using Backend.Forms;

namespace Backend.Endpoints.Forms;

public class FormLogoEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");

        app.MapPost("/api/forms/{id:int}/logo", async (HttpContext context, FormsService formsService, int id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            var form = formsService.GetFormById(id, userId.Value);
            if (form == null) return Results.NotFound(new { error = "Form not found" });

            if (!context.Request.HasFormContentType)
                return Results.BadRequest(new { error = "Request must be multipart/form-data" });

            var formFile = context.Request.Form.Files.GetFile("logo");
            if (formFile == null || formFile.Length == 0)
                return Results.BadRequest(new { error = "No file uploaded" });

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg" };
            var extension = Path.GetExtension(formFile.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                return Results.BadRequest(new { error = "Invalid file type. Allowed: jpg, jpeg, png, gif, webp, svg" });

            if (formFile.Length > 5 * 1024 * 1024)
                return Results.BadRequest(new { error = "File size must be less than 5MB" });

            Directory.CreateDirectory(uploadsPath);
            var fileName = $"{form.PublicId}-logo{extension}";
            var filePath = Path.Combine(uploadsPath, fileName);

            if (!string.IsNullOrEmpty(form.LogoUrl))
            {
                var oldFilePath = Path.Combine(uploadsPath, Path.GetFileName(form.LogoUrl));
                if (File.Exists(oldFilePath)) File.Delete(oldFilePath);
            }

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await formFile.CopyToAsync(stream);
            }

            var logoUrl = $"/uploads/{fileName}";
            formsService.UpdateForm(id, new UpdateFormDto { LogoUrl = logoUrl }, userId.Value);

            return Results.Ok(new { logoUrl });
        }).RequireAuth().DisableAntiforgery();

        app.MapDelete("/api/forms/{id:int}/logo", (HttpContext context, FormsService formsService, int id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            var form = formsService.GetFormById(id, userId.Value);
            if (form == null) return Results.NotFound(new { error = "Form not found" });

            if (!string.IsNullOrEmpty(form.LogoUrl))
            {
                var filePath = Path.Combine(uploadsPath, Path.GetFileName(form.LogoUrl));
                if (File.Exists(filePath)) File.Delete(filePath);
            }

            formsService.UpdateForm(id, new UpdateFormDto { LogoUrl = "" }, userId.Value);
            return Results.Ok(new { message = "Logo removed successfully" });
        }).RequireAuth();
    }
}
