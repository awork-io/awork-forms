using Backend.Data;
using Backend.Data.Entities;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Backend.Endpoints.Submissions;

public class UploadFileEndpoint : IEndpoint
{
    private const int DefaultMaxFileSizeMb = 10;
    private const int HardMaxFileSizeMb = 25;

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

            var requestForm = await context.Request.ReadFormAsync();
            var formFile = requestForm.Files.GetFile("file");
            if (formFile == null || formFile.Length == 0)
                return Results.BadRequest(new { error = "No file uploaded" });

            // Hard safety net for memory/storage usage, independent of field-level limits.
            if (formFile.Length > HardMaxFileSizeMb * 1024 * 1024)
                return Results.BadRequest(new { error = $"File size must be less than {HardMaxFileSizeMb}MB" });

            var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp",
                ".doc", ".docx", ".xls", ".xlsx",
                ".txt", ".csv", ".zip"
            };

            var extension = Path.GetExtension(formFile.FileName);
            if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
                return Results.BadRequest(new { error = "Invalid file type" });

            var configuredMaxFileSizeMb = DefaultMaxFileSizeMb;
            var fieldId = requestForm["fieldId"].ToString();
            if (!string.IsNullOrWhiteSpace(fieldId))
            {
                var fileField = ResolveFileField(form.FieldsJson, fieldId);
                if (fileField == null)
                    return Results.BadRequest(new { error = "Invalid upload target field" });

                if (!string.IsNullOrWhiteSpace(fileField.AcceptedFileTypes))
                {
                    var configuredExtensions = ParseAllowedExtensions(fileField.AcceptedFileTypes);
                    if (configuredExtensions.Count > 0 && !configuredExtensions.Contains(extension))
                        return Results.BadRequest(new { error = "Invalid file type for this field" });
                }

                if (fileField.MaxFileSizeMB is > 0)
                    configuredMaxFileSizeMb = Math.Min(fileField.MaxFileSizeMB.Value, HardMaxFileSizeMb);
            }

            if (formFile.Length > configuredMaxFileSizeMb * 1024L * 1024L)
                return Results.BadRequest(new { error = $"File size must be less than {configuredMaxFileSizeMb}MB" });

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

    private static HashSet<string> ParseAllowedExtensions(string acceptedFileTypes)
    {
        return acceptedFileTypes
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(ext => ext.StartsWith('.') ? ext : $".{ext}")
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static UploadFormField? ResolveFileField(string fieldsJson, string fieldId)
    {
        try
        {
            var fields = JsonSerializer.Deserialize<List<UploadFormField>>(
                fieldsJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
            return fields.FirstOrDefault(f => f.Id == fieldId && f.Type == "file");
        }
        catch
        {
            return null;
        }
    }

    private sealed class UploadFormField
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? AcceptedFileTypes { get; set; }
        public int? MaxFileSizeMB { get; set; }
    }
}
