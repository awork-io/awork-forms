using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Backend.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        var dbUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
        if (!string.IsNullOrEmpty(dbUrl))
        {
            optionsBuilder.UseNpgsql(dbUrl);
        }
        else
        {
            optionsBuilder.UseNpgsql("Host=localhost;Database=awork_forms;Username=postgres;Password=postgres");
        }
        return new AppDbContext(optionsBuilder.Options);
    }
}
