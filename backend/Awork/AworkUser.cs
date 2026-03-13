namespace Backend.Awork;

public class AworkUser
{
    public Guid Id { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Position { get; set; }
    public string? ProfileImage { get; set; }
    public bool IsExternal { get; set; }
    public bool IsArchived { get; set; }
    public bool IsDeactivated { get; set; }
}
