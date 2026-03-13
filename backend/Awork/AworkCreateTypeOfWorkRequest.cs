namespace Backend.Awork;

public class AworkCreateTypeOfWorkRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
}
