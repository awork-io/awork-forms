namespace Backend.Submissions;

public class SubmissionProcessResult
{
    public int SubmissionId { get; set; }
    public string Status { get; set; } = "pending";
    public Guid? AworkProjectId { get; set; }
    public Guid? AworkTaskId { get; set; }
    public string? ErrorMessage { get; set; }
}
