namespace Backend.Endpoints.Submissions;

public class UploadFileEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "submissions");

        app.MapPost("/api/f/{publicId:guid}/upload", async (HttpContext context, Guid publicId) =>
        {
            if (!context.Request.HasFormContentType)
                return Results.BadRequest(new { error = "Request must be multipart/form-data" });

            var formFile = context.Request.Form.Files.GetFile("file");
            if (formFile == null || formFile.Length == 0)
                return Results.BadRequest(new { error = "No file uploaded" });

            // Validate file size (max 10MB)
            if (formFile.Length > 10 * 1024 * 1024)
                return Results.BadRequest(new { error = "File size must be less than 10MB" });

            // Create uploads directory
            Directory.CreateDirectory(uploadsPath);

            // Generate unique filename
            var extension = Path.GetExtension(formFile.FileName);
            var fileName = $"{publicId}_{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsPath, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await formFile.CopyToAsync(stream);
            }

            // Return the URL that can be used for the submission
            var fileUrl = $"/uploads/submissions/{fileName}";
            return Results.Ok(new
            {
                fileName = formFile.FileName,
                fileUrl,
                fileSize = formFile.Length
            });
        }).DisableAntiforgery();
    }
}
