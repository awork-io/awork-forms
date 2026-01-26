using System.Text.Json;
using Backend.Forms;
using Backend.Submissions;

namespace Backend.Endpoints.Submissions;

public class SubmitFormEndpoint : IEndpoint
{
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

            var dataJson = JsonSerializer.Serialize(dto.Data);
            var submission = formsService.CreateSubmission(form.Id, dataJson);
            var result = await processor.ProcessSubmissionAsync(submission.Id);

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
        });
    }
}
