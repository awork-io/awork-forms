namespace Backend.Awork;

public class AworkCustomFieldDefinition
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public bool IsRequired { get; set; }
    public bool IsArchived { get; set; }
    public List<AworkCustomFieldSelectionOption>? SelectionOptions { get; set; }
}
