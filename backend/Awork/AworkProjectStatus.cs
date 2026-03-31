namespace Backend.Awork;

public class AworkProjectStatus
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public double Order { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? WorkflowId { get; set; }
}
