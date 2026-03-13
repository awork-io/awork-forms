namespace Backend.Awork;

public class AworkCreateProjectResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ProjectTypeId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
}
