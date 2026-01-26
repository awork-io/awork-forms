namespace Backend.Awork;

public class AworkProject
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ProjectTypeId { get; set; }
    public Guid? ProjectStatusId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsBillableByDefault { get; set; }
    public string? Color { get; set; }
}

public class AworkProjectType
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public bool IsPreset { get; set; }
}

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
}

public class AworkProjectStatus
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Order { get; set; }
}

public class AworkTaskStatus
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Order { get; set; }
}

public class AworkTaskList
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
    public int OrderOfNewTasks { get; set; }
}

public class AworkTypeOfWork
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public bool IsArchived { get; set; }
}

public class AworkTokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
    public string TokenType { get; set; } = string.Empty;
}

public class TokenRefreshResult
{
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
}

public class AworkCreateProjectRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ProjectTypeId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
}

public class AworkCreateProjectResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ProjectTypeId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
}

public class AworkCreateTaskRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string BaseType { get; set; } = "projecttask";
    public Guid? ProjectId { get; set; }
    public Guid? EntityId { get; set; }
    public bool IsPriority { get; set; }
    public DateTime? DueOn { get; set; }
    public DateTime? StartOn { get; set; }
    public int? PlannedDuration { get; set; }
    public Guid? TaskStatusId { get; set; }
    public Guid? TypeOfWorkId { get; set; }
    public List<AworkTaskListAssignment>? Lists { get; set; }
    public List<AworkTaskAssignment>? Assignments { get; set; }
}

public class AworkTaskListAssignment
{
    public Guid Id { get; set; }
    public int Order { get; set; } = int.MaxValue;
}

public class AworkTaskAssignment
{
    public Guid UserId { get; set; }
}

public class AworkCreateTaskResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsPriority { get; set; }
    public DateTime? DueOn { get; set; }
    public DateTime? StartOn { get; set; }
    public int? PlannedDuration { get; set; }
    public Guid? TaskStatusId { get; set; }
    public Guid? ProjectId { get; set; }
}

public class AworkCustomFieldDefinition
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public bool IsRequired { get; set; }
    public bool IsArchived { get; set; }
    public List<AworkCustomFieldSelectionOption>? SelectionOptions { get; set; }
}

public class AworkCustomFieldSelectionOption
{
    public Guid Id { get; set; }
    public string Value { get; set; } = string.Empty;
    public int Order { get; set; }
}

public class CustomFieldValue
{
    public Guid CustomFieldDefinitionId { get; set; }
    public string? TextValue { get; set; }
    public decimal? NumberValue { get; set; }
    public DateTime? DateValue { get; set; }
    public Guid? SelectionOptionId { get; set; }
    public List<Guid>? MultiSelectionOptionIds { get; set; }
    public Guid? UserId { get; set; }
    public string? LinkValue { get; set; }
}
