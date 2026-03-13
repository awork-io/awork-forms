using System.Text.Json.Serialization;

namespace Backend.Awork;

public class AworkCreateTaskRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string BaseType { get; set; } = "projecttask";
    public Guid? EntityId { get; set; }

    [JsonPropertyName("isPrio")]
    public bool IsPriority { get; set; }

    public DateTime? DueOn { get; set; }
    public DateTime? StartOn { get; set; }
    public int? PlannedDuration { get; set; }
    public Guid? TaskStatusId { get; set; }
    public Guid? TypeOfWorkId { get; set; }
    public List<AworkTaskListAssignment>? Lists { get; set; }
}
