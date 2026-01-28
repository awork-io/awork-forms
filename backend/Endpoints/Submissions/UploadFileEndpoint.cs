using Backend.Data;
using Backend.Data.Entities;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints.Submissions;

public class UploadFileEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/f/{publicId:guid}/upload", async (HttpContext context, AppDbContext db, Guid publicId) =>
        {
            var form = await db.Forms.FirstOrDefaultAsync(f => f.PublicId == publicId);
            if (form == null)
                return Results.NotFound(new { error = "Form not found" });
            if (!form.IsActive)
                return Results.BadRequest(new { error = "This form is no longer accepting submissions" });

            if (!context.Request.HasFormContentType)
                return Results.BadRequest(new { error = "Request must be multipart/form-data" });

            var formFile = context.Request.Form.Files.GetFile("file");
            if (formFile == null || formFile.Length == 0)
                return Results.BadRequest(new { error = "No file uploaded" });

            // Validate file size (max 10MB)
            if (formFile.Length > 10 * 1024 * 1024)
                return Results.BadRequest(new { error = "File size must be less than 10MB" });

            var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp",
                ".doc", ".docx", ".xls", ".xlsx",
                ".txt", ".csv", ".zip"
            };
            var extension = Path.GetExtension(formFile.FileName);
            if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
                return Results.BadRequest(new { error = "Invalid file type" });

            // Read file into memory
            using var memoryStream = new MemoryStream();
            await formFile.CopyToAsync(memoryStream);
            var fileData = memoryStream.ToArray();

            // Create file upload record
            var fileUpload = new FileUpload
            {
                PublicId = Guid.NewGuid(),
                FormPublicId = publicId,
                FileName = formFile.FileName,
                ContentType = formFile.ContentType ?? "application/octet-stream",
                FileSize = formFile.Length,
                Data = fileData,
                CreatedAt = DateTime.UtcNow
            };

            db.FileUploads.Add(fileUpload);
            await db.SaveChangesAsync();

            // Return the URL that can be used for the submission
            var fileUrl = $"/api/files/{fileUpload.PublicId}";
            return Results.Ok(new
            {
                fileName = formFile.FileName,
                fileUrl,
                fileSize = formFile.Length
            });
        }).DisableAntiforgery().RequireRateLimiting("public");
    }
}
