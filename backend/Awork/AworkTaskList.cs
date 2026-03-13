namespace Backend.Awork;

public class AworkTaskList
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Order { get; set; }
    public double OrderOfNewTasks { get; set; }
}
