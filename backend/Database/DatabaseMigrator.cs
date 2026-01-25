using Microsoft.Data.Sqlite;

namespace Backend.Database;

public static class DatabaseMigrator
{
    public static void Migrate(string connectionString)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        // Create migrations table to track applied migrations
        ExecuteNonQuery(connection, @"
            CREATE TABLE IF NOT EXISTS __Migrations (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL UNIQUE,
                AppliedAt TEXT NOT NULL
            )
        ");

        // Apply migrations
        ApplyMigration(connection, "001_CreateUsersTable", CreateUsersTable);
        ApplyMigration(connection, "002_CreateFormsTable", CreateFormsTable);
        ApplyMigration(connection, "003_CreateSubmissionsTable", CreateSubmissionsTable);
    }

    private static void ApplyMigration(SqliteConnection connection, string name, Action<SqliteConnection> migration)
    {
        // Check if migration already applied
        using var checkCmd = connection.CreateCommand();
        checkCmd.CommandText = "SELECT COUNT(*) FROM __Migrations WHERE Name = @name";
        checkCmd.Parameters.AddWithValue("@name", name);
        var count = Convert.ToInt64(checkCmd.ExecuteScalar());

        if (count == 0)
        {
            Console.WriteLine($"Applying migration: {name}");
            migration(connection);

            // Record migration
            using var insertCmd = connection.CreateCommand();
            insertCmd.CommandText = "INSERT INTO __Migrations (Name, AppliedAt) VALUES (@name, @appliedAt)";
            insertCmd.Parameters.AddWithValue("@name", name);
            insertCmd.Parameters.AddWithValue("@appliedAt", DateTime.UtcNow.ToString("O"));
            insertCmd.ExecuteNonQuery();
        }
    }

    private static void CreateUsersTable(SqliteConnection connection)
    {
        ExecuteNonQuery(connection, @"
            CREATE TABLE Users (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                AworkUserId TEXT NOT NULL,
                AworkWorkspaceId TEXT NOT NULL,
                Email TEXT NOT NULL,
                Name TEXT NOT NULL,
                AvatarUrl TEXT,
                AccessToken TEXT,
                RefreshToken TEXT,
                TokenExpiresAt TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                UNIQUE(AworkUserId, AworkWorkspaceId)
            )
        ");

        ExecuteNonQuery(connection, @"
            CREATE INDEX IX_Users_AworkUserId ON Users(AworkUserId)
        ");
    }

    private static void CreateFormsTable(SqliteConnection connection)
    {
        ExecuteNonQuery(connection, @"
            CREATE TABLE Forms (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                PublicId TEXT NOT NULL UNIQUE,
                UserId INTEGER NOT NULL,
                Name TEXT NOT NULL,
                Description TEXT,
                FieldsJson TEXT NOT NULL DEFAULT '[]',
                ActionType TEXT,
                AworkProjectId TEXT,
                AworkProjectTypeId TEXT,
                FieldMappingsJson TEXT,
                PrimaryColor TEXT,
                BackgroundColor TEXT,
                LogoUrl TEXT,
                IsActive INTEGER NOT NULL DEFAULT 1,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                FOREIGN KEY (UserId) REFERENCES Users(Id)
            )
        ");

        ExecuteNonQuery(connection, @"
            CREATE INDEX IX_Forms_PublicId ON Forms(PublicId)
        ");

        ExecuteNonQuery(connection, @"
            CREATE INDEX IX_Forms_UserId ON Forms(UserId)
        ");
    }

    private static void CreateSubmissionsTable(SqliteConnection connection)
    {
        ExecuteNonQuery(connection, @"
            CREATE TABLE Submissions (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                FormId INTEGER NOT NULL,
                DataJson TEXT NOT NULL DEFAULT '{}',
                Status TEXT NOT NULL DEFAULT 'pending',
                AworkProjectId TEXT,
                AworkTaskId TEXT,
                ErrorMessage TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                FOREIGN KEY (FormId) REFERENCES Forms(Id)
            )
        ");

        ExecuteNonQuery(connection, @"
            CREATE INDEX IX_Submissions_FormId ON Submissions(FormId)
        ");

        ExecuteNonQuery(connection, @"
            CREATE INDEX IX_Submissions_Status ON Submissions(Status)
        ");
    }

    private static void ExecuteNonQuery(SqliteConnection connection, string sql)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        cmd.ExecuteNonQuery();
    }
}
