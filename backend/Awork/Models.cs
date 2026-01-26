namespace Backend.Awork;

public class AworkProject
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ProjectTypeId { get; set; }
    public string? ProjectStatusId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsBillableByDefault { get; set; }
    public string? Color { get; set; }
}

public class AworkProjectType
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public bool IsPreset { get; set; }
}

public class AworkUser
{
    public string Id { get; set; } = string.Empty;
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
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Order { get; set; }
}

public class AworkTaskStatus
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Order { get; set; }
}

public class AworkTaskList
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
    public int OrderOfNewTasks { get; set; }
}

public class AworkTypeOfWork
{
    public string Id { get; set; } = string.Empty;
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
    public string? ProjectTypeId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
}

public class AworkCreateProjectResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ProjectTypeId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
}

public class AworkCreateTaskRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? BaseType { get; set; }
    public string? EntityId { get; set; }
    public bool IsPriority { get; set; }
    public DateTime? DueOn { get; set; }
    public DateTime? StartOn { get; set; }
    public int? PlannedDuration { get; set; }
    public string? TaskStatusId { get; set; }
    public string? TypeOfWorkId { get; set; }
    public string? ListId { get; set; }
    public List<AworkTaskAssignment>? Assignments { get; set; }
}

public class AworkTaskAssignment
{
    public string UserId { get; set; } = string.Empty;
}

public class AworkCreateTaskResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsPriority { get; set; }
    public DateTime? DueOn { get; set; }
    public DateTime? StartOn { get; set; }
    public int? PlannedDuration { get; set; }
    public string? TaskStatusId { get; set; }
    public string? ProjectId { get; set; }
}

public class AworkCustomFieldDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public bool IsRequired { get; set; }
    public bool IsArchived { get; set; }
    public List<AworkCustomFieldSelectionOption>? SelectionOptions { get; set; }
}

public class AworkCustomFieldSelectionOption
{
    public string Id { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public int Order { get; set; }
}
