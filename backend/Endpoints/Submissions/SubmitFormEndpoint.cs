using System.Text.Json;
using Backend.Forms;
using Backend.Submissions;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Endpoints.Submissions;

public class SubmitFormEndpoint : IEndpoint
{
    private const int MaxFilesPerField = 20;

    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/f/{publicId:guid}/submit", async (
            FormsService formsService,
            SubmissionProcessor processor,
            Guid publicId,
            CreateSubmissionDto dto) =>
        {
            var form = formsService.GetPublicFormByPublicId(publicId);
            if (form == null) return Results.NotFound(new { error = "Form not found" });
            if (!form.IsActive) return Results.BadRequest(new { error = "This form is no longer accepting submissions" });

            foreach (var field in SubmissionProcessor.ParseFormFields(form.FieldsJson ?? "[]").Where(f => f.Type == "file"))
            {
                if (!dto.Data.TryGetValue(field.Id, out var value) || value is not JsonElement { ValueKind: JsonValueKind.Array } files) continue;
                if (files.GetArrayLength() > MaxFilesPerField)
                    return Results.BadRequest(new { error = $"A file field can contain at most {MaxFilesPerField} files" });
            }

            // Ratings feed number custom fields; reject anything outside the configured scale.
            foreach (var field in SubmissionProcessor.ParseFormFields(form.FieldsJson ?? "[]").Where(f => f.Type == "rating"))
            {
                if (!dto.Data.TryGetValue(field.Id, out var value)) continue;
                var validationError = RatingScale.Validate(field, value);
                if (validationError != null) return Results.BadRequest(new { error = validationError });
            }

            var dataJson = JsonSerializer.Serialize(dto.Data);
            var submission = formsService.CreateSubmission(form.Id, dataJson);
            var result = await processor.ProcessSubmission(submission.Id);

            if (result.Status == "completed")
            {
                return Results.Created($"/api/submissions/{submission.Id}", new
                {
                    success = true,
                    message = "Thank you for your submission!",
                    submissionId = submission.Id,
                    aworkProjectId = result.AworkProjectId,
                    aworkTaskId = result.AworkTaskId
                });
            }

            return Results.Created($"/api/submissions/{submission.Id}", new
            {
                success = true,
                message = "Thank you for your submission!",
                submissionId = submission.Id,
                integrationStatus = result.Status,
                integrationError = result.ErrorMessage
            });
        }).RequireRateLimiting("public");
    }
}
