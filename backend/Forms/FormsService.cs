using Backend.Database;

namespace Backend.Forms;

public class FormsService
{
    private readonly DbContextFactory _dbFactory;

    public FormsService(DbContextFactory dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public List<FormListDto> GetFormsByUser(int userId)
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();

        cmd.CommandText = @"
            SELECT f.Id, f.PublicId, f.Name, f.Description, f.IsActive, f.CreatedAt, f.UpdatedAt,
                   (SELECT COUNT(*) FROM Submissions s WHERE s.FormId = f.Id) as SubmissionCount,
                   f.FieldsJson
            FROM Forms f
            WHERE f.UserId = @userId
            ORDER BY f.UpdatedAt DESC";

        var p = cmd.CreateParameter();
        p.ParameterName = "@userId";
        p.Value = userId;
        cmd.Parameters.Add(p);

        var forms = new List<FormListDto>();
        using var reader = cmd.ExecuteReader();

        while (reader.Read())
        {
            var fieldsJson = reader.GetString(8);
            var fieldCount = CountFields(fieldsJson);

            forms.Add(new FormListDto
            {
                Id = reader.GetInt32(0),
                PublicId = reader.GetGuid(1),
                Name = reader.GetString(2),
                Description = reader.IsDBNull(3) ? null : reader.GetString(3),
                IsActive = reader.GetBoolean(4),
                CreatedAt = DateTime.Parse(reader.GetString(5)),
                UpdatedAt = DateTime.Parse(reader.GetString(6)),
                SubmissionCount = reader.GetInt32(7),
                FieldCount = fieldCount
            });
        }

        return forms;
    }

    public FormDetailDto? GetFormById(int formId, int userId)
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();

        cmd.CommandText = @"
            SELECT Id, PublicId, Name, Description, FieldsJson, ActionType,
                   AworkProjectId, AworkProjectTypeId, FieldMappingsJson,
                   PrimaryColor, BackgroundColor, LogoUrl, IsActive, CreatedAt, UpdatedAt
            FROM Forms
            WHERE Id = @id AND UserId = @userId";

        var p1 = cmd.CreateParameter(); p1.ParameterName = "@id"; p1.Value = formId; cmd.Parameters.Add(p1);
        var p2 = cmd.CreateParameter(); p2.ParameterName = "@userId"; p2.Value = userId; cmd.Parameters.Add(p2);

        using var reader = cmd.ExecuteReader();

        if (!reader.Read())
        {
            return null;
        }

        return new FormDetailDto
        {
            Id = reader.GetInt32(0),
            PublicId = reader.GetGuid(1),
            Name = reader.GetString(2),
            Description = reader.IsDBNull(3) ? null : reader.GetString(3),
            FieldsJson = reader.GetString(4),
            ActionType = reader.IsDBNull(5) ? null : reader.GetString(5),
            AworkProjectId = reader.IsDBNull(6) ? null : reader.GetString(6),
            AworkProjectTypeId = reader.IsDBNull(7) ? null : reader.GetString(7),
            FieldMappingsJson = reader.IsDBNull(8) ? null : reader.GetString(8),
            PrimaryColor = reader.IsDBNull(9) ? null : reader.GetString(9),
            BackgroundColor = reader.IsDBNull(10) ? null : reader.GetString(10),
            LogoUrl = reader.IsDBNull(11) ? null : reader.GetString(11),
            IsActive = reader.GetBoolean(12),
            CreatedAt = DateTime.Parse(reader.GetString(13)),
            UpdatedAt = DateTime.Parse(reader.GetString(14))
        };
    }

    public FormDetailDto CreateForm(CreateFormDto dto, int userId)
    {
        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();

        var publicId = Guid.NewGuid();
        var now = DateTime.UtcNow.ToString("o");

        cmd.CommandText = @"
            INSERT INTO Forms (PublicId, UserId, Name, Description, FieldsJson, ActionType,
                              AworkProjectId, AworkProjectTypeId, FieldMappingsJson,
                              PrimaryColor, BackgroundColor, IsActive, CreatedAt, UpdatedAt)
            VALUES (@publicId, @userId, @name, @description, @fieldsJson, @actionType,
                    @aworkProjectId, @aworkProjectTypeId, @fieldMappingsJson,
                    @primaryColor, @backgroundColor, @isActive, @now, @now);
            SELECT last_insert_rowid();";

        AddParameter(cmd, "@publicId", publicId.ToString());
        AddParameter(cmd, "@userId", userId);
        AddParameter(cmd, "@name", dto.Name);
        AddParameter(cmd, "@description", dto.Description ?? (object)DBNull.Value);
        AddParameter(cmd, "@fieldsJson", dto.FieldsJson ?? "[]");
        AddParameter(cmd, "@actionType", dto.ActionType ?? (object)DBNull.Value);
        AddParameter(cmd, "@aworkProjectId", dto.AworkProjectId ?? (object)DBNull.Value);
        AddParameter(cmd, "@aworkProjectTypeId", dto.AworkProjectTypeId ?? (object)DBNull.Value);
        AddParameter(cmd, "@fieldMappingsJson", dto.FieldMappingsJson ?? (object)DBNull.Value);
        AddParameter(cmd, "@primaryColor", dto.PrimaryColor ?? (object)DBNull.Value);
        AddParameter(cmd, "@backgroundColor", dto.BackgroundColor ?? (object)DBNull.Value);
        AddParameter(cmd, "@isActive", dto.IsActive ?? true);
        AddParameter(cmd, "@now", now);

        var formId = Convert.ToInt32(cmd.ExecuteScalar());

        return GetFormById(formId, userId)!;
    }

    public FormDetailDto? UpdateForm(int formId, UpdateFormDto dto, int userId)
    {
        // First check if form exists and belongs to user
        var existing = GetFormById(formId, userId);
        if (existing == null)
        {
            return null;
        }

        using var ctx = _dbFactory.CreateContext();
        using var cmd = ctx.Connection.CreateCommand();

        var now = DateTime.UtcNow.ToString("o");

        cmd.CommandText = @"
            UPDATE Forms SET
                Name = @name,
                Description = @description,
                FieldsJson = @fieldsJson,
                ActionType = @actionType,
                AworkProjectId = @aworkProjectId,
                AworkProjectTypeId = @aworkProjectTypeId,
                FieldMappingsJson = @fieldMappingsJson,
                PrimaryColor = @primaryColor,
                BackgroundColor = @backgroundColor,
                IsActive = @isActive,
                UpdatedAt = @now
            WHERE Id = @id AND UserId = @userId";

        AddParameter(cmd, "@id", formId);
        AddParameter(cmd, "@userId", userId);
        AddParameter(cmd, "@name", dto.Name ?? existing.Name);
        AddParameter(cmd, "@description", dto.Description ?? existing.Description ?? (object)DBNull.Value);
        AddParameter(cmd, "@fieldsJson", dto.FieldsJson ?? existing.FieldsJson);
        AddParameter(cmd, "@actionType", dto.ActionType ?? existing.ActionType ?? (object)DBNull.Value);
        AddParameter(cmd, "@aworkProjectId", dto.AworkProjectId ?? existing.AworkProjectId ?? (object)DBNull.Value);
        AddParameter(cmd, "@aworkProjectTypeId", dto.AworkProjectTypeId ?? existing.AworkProjectTypeId ?? (object)DBNull.Value);
        AddParameter(cmd, "@fieldMappingsJson", dto.FieldMappingsJson ?? existing.FieldMappingsJson ?? (object)DBNull.Value);
        AddParameter(cmd, "@primaryColor", dto.PrimaryColor ?? existing.PrimaryColor ?? (object)DBNull.Value);
        AddParameter(cmd, "@backgroundColor", dto.BackgroundColor ?? existing.BackgroundColor ?? (object)DBNull.Value);
        AddParameter(cmd, "@isActive", dto.IsActive ?? existing.IsActive);
        AddParameter(cmd, "@now", now);

        cmd.ExecuteNonQuery();

        return GetFormById(formId, userId);
    }

    public bool DeleteForm(int formId, int userId)
    {
        using var ctx = _dbFactory.CreateContext();

        // First delete related submissions
        using var deleteSubCmd = ctx.Connection.CreateCommand();
        deleteSubCmd.CommandText = @"
            DELETE FROM Submissions
            WHERE FormId = @formId AND FormId IN (SELECT Id FROM Forms WHERE UserId = @userId)";
        AddParameter(deleteSubCmd, "@formId", formId);
        AddParameter(deleteSubCmd, "@userId", userId);
        deleteSubCmd.ExecuteNonQuery();

        // Then delete the form
        using var cmd = ctx.Connection.CreateCommand();
        cmd.CommandText = "DELETE FROM Forms WHERE Id = @id AND UserId = @userId";
        AddParameter(cmd, "@id", formId);
        AddParameter(cmd, "@userId", userId);

        var rowsAffected = cmd.ExecuteNonQuery();
        return rowsAffected > 0;
    }

    private static int CountFields(string fieldsJson)
    {
        // Simple count of field objects in JSON array
        // Counts occurrences of opening braces that follow [ or ,
        if (string.IsNullOrEmpty(fieldsJson) || fieldsJson == "[]")
        {
            return 0;
        }

        int count = 0;
        int depth = 0;
        bool inString = false;

        for (int i = 0; i < fieldsJson.Length; i++)
        {
            char c = fieldsJson[i];

            if (c == '"' && (i == 0 || fieldsJson[i - 1] != '\\'))
            {
                inString = !inString;
                continue;
            }

            if (inString) continue;

            if (c == '[' || c == '{')
            {
                if (c == '{' && depth == 1)
                {
                    count++;
                }
                depth++;
            }
            else if (c == ']' || c == '}')
            {
                depth--;
            }
        }

        return count;
    }

    private static void AddParameter(Microsoft.Data.Sqlite.SqliteCommand cmd, string name, object value)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = name;
        p.Value = value;
        cmd.Parameters.Add(p);
    }
}

// DTOs
public class FormListDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int SubmissionCount { get; set; }
    public int FieldCount { get; set; }
}

public class FormDetailDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string FieldsJson { get; set; } = "[]";
    public string? ActionType { get; set; }
    public string? AworkProjectId { get; set; }
    public string? AworkProjectTypeId { get; set; }
    public string? FieldMappingsJson { get; set; }
    public string? PrimaryColor { get; set; }
    public string? BackgroundColor { get; set; }
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateFormDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? FieldsJson { get; set; }
    public string? ActionType { get; set; }
    public string? AworkProjectId { get; set; }
    public string? AworkProjectTypeId { get; set; }
    public string? FieldMappingsJson { get; set; }
    public string? PrimaryColor { get; set; }
    public string? BackgroundColor { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateFormDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? FieldsJson { get; set; }
    public string? ActionType { get; set; }
    public string? AworkProjectId { get; set; }
    public string? AworkProjectTypeId { get; set; }
    public string? FieldMappingsJson { get; set; }
    public string? PrimaryColor { get; set; }
    public string? BackgroundColor { get; set; }
    public bool? IsActive { get; set; }
}
