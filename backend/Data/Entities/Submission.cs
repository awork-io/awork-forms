namespace Backend.Data.Entities;

public class Submission
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public string DataJson { get; set; } = "{}";
    public string Status { get; set; } = "pending";
    public string? AworkProjectId { get; set; }
    public string? AworkTaskId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Form Form { get; set; } = null!;
}
