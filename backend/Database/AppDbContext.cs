using Microsoft.Data.Sqlite;

namespace Backend.Database;

public class AppDbContext : IDisposable
{
    private readonly SqliteConnection _connection;
    private bool _disposed;

    public AppDbContext(string connectionString)
    {
        _connection = new SqliteConnection(connectionString);
        _connection.Open();
    }

    public SqliteConnection Connection => _connection;

    public void Dispose()
    {
        if (!_disposed)
        {
            _connection.Close();
            _connection.Dispose();
            _disposed = true;
        }
    }
}

public class DbContextFactory
{
    private readonly string _connectionString;

    public DbContextFactory(string connectionString)
    {
        _connectionString = connectionString;
    }

    public AppDbContext CreateContext()
    {
        return new AppDbContext(_connectionString);
    }

    public string ConnectionString => _connectionString;
}
