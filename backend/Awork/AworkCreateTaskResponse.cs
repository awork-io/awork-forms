namespace Backend.Awork;

public class AworkCreateTaskResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsPriority { get; set; }
    public DateTime? DueOn { get; set; }
    public DateTime? StartOn { get; set; }
    public int? PlannedDuration { get; set; }
    public Guid? TaskStatusId { get; set; }
    public Guid? ProjectId { get; set; }
}
