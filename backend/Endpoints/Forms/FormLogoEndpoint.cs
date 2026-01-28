using Backend.Data;
using Backend.Forms;

namespace Backend.Endpoints.Forms;

public class FormLogoEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/forms/{id:int}/logo", async (HttpContext context, AppDbContext db, FormsService formsService, int id) =>
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

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(formFile.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                return Results.BadRequest(new { error = "Invalid file type. Allowed: jpg, jpeg, png, gif, webp, svg" });

            if (formFile.Length > 5 * 1024 * 1024)
                return Results.BadRequest(new { error = "File size must be less than 5MB" });

            // Read file into memory
            using var memoryStream = new MemoryStream();
            await formFile.CopyToAsync(memoryStream);
            var fileData = memoryStream.ToArray();

            // Update form with logo data
            var dbForm = await db.Forms.FindAsync(id);
            if (dbForm == null) return Results.NotFound();

            dbForm.LogoData = fileData;
            dbForm.LogoContentType = formFile.ContentType ?? "image/png";
            dbForm.LogoUrl = $"/api/f/{dbForm.PublicId}/logo";
            dbForm.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(new { logoUrl = dbForm.LogoUrl });
        }).RequireAuth().DisableAntiforgery();

        app.MapGet("/api/forms/{id:int}/logo", async (AppDbContext db, int id) =>
        {
            var form = await db.Forms.FindAsync(id);
            if (form?.LogoData == null)
                return Results.NotFound();

            return Results.File(form.LogoData, form.LogoContentType ?? "image/png");
        });

        // Public logo endpoint (for public form viewers)
        app.MapGet("/api/f/{publicId:guid}/logo", (AppDbContext db, Guid publicId) =>
        {
            var form = db.Forms.FirstOrDefault(f => f.PublicId == publicId);
            if (form?.LogoData == null)
                return Results.NotFound();

            return Results.File(form.LogoData, form.LogoContentType ?? "image/png");
        });

        app.MapDelete("/api/forms/{id:int}/logo", async (HttpContext context, AppDbContext db, FormsService formsService, int id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            var form = formsService.GetFormById(id, userId.Value);
            if (form == null) return Results.NotFound(new { error = "Form not found" });

            var dbForm = await db.Forms.FindAsync(id);
            if (dbForm == null) return Results.NotFound();

            dbForm.LogoData = null;
            dbForm.LogoContentType = null;
            dbForm.LogoUrl = null;
            dbForm.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Logo removed successfully" });
        }).RequireAuth();
    }
}
