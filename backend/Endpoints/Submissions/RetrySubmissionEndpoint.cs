using Backend.Forms;
using Backend.Submissions;

namespace Backend.Endpoints.Submissions;

public class RetrySubmissionEndpoint : IEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/submissions/{id:int}/retry", async (
            HttpContext context,
            FormsService formsService,
            SubmissionProcessor processor,
            int id) =>
        {
            var userId = context.GetCurrentUserId();
            if (userId == null) return Results.Unauthorized();

            var submission = formsService.GetSubmissionById(id, userId.Value);
            if (submission == null) return Results.NotFound(new { error = "Submission not found" });
            if (!string.Equals(submission.Status, "failed", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "Only failed submissions can be retried" });

            if (!formsService.PrepareFailedSubmissionRetry(id, userId.Value))
                return Results.BadRequest(new { error = "Only failed submissions can be retried" });

            await processor.ProcessSubmission(id);

            var updatedSubmission = formsService.GetSubmissionById(id, userId.Value);
            if (updatedSubmission == null) return Results.NotFound(new { error = "Submission not found" });

            return Results.Ok(updatedSubmission);
        }).RequireAuth();
    }
}
