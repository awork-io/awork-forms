namespace Backend.Awork;

public class AworkTypeOfWork
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public bool IsArchived { get; set; }
}
