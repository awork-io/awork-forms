namespace Backend.Awork;

public class AworkProject
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ProjectKey { get; set; }
    public Guid? ProjectTypeId { get; set; }
    public Guid? ProjectStatusId { get; set; }
    public Guid? CompanyId { get; set; }
    public AworkCompany? Company { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsBillableByDefault { get; set; }
    public string? Color { get; set; }
}
