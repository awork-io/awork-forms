namespace Backend.Awork;

public class CustomFieldValue
{
    public Guid CustomFieldDefinitionId { get; set; }
    public Guid? UserIdValue { get; set; }
    public Guid? ClientIdValue { get; set; }
    public double? NumberValue { get; set; }
    public Guid? SelectionOptionIdValue { get; set; }
    public string? TextValue { get; set; }
    public DateTime? DateValue { get; set; }
    public bool? BooleanValue { get; set; }
}
