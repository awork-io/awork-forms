namespace Backend.Awork;

public class AworkTaskStatus
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public double Order { get; set; }
}
