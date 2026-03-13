namespace Backend.Awork;

public class AworkProjectType
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public bool IsPreset { get; set; }
}
