namespace Backend.Submissions;

public class SubmissionProcessResult
{
    public int SubmissionId { get; set; }
    public string Status { get; set; } = "pending";
    public string? AworkProjectId { get; set; }
    public string? AworkTaskId { get; set; }
    public string? ErrorMessage { get; set; }
}
