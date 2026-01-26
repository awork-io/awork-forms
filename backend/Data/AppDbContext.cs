using Backend.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Form> Forms => Set<Form>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<OAuthState> OAuthStates => Set<OAuthState>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => new { e.AworkUserId, e.AworkWorkspaceId }).IsUnique();
            entity.HasIndex(e => e.AworkUserId);
        });

        modelBuilder.Entity<Form>(entity =>
        {
            entity.HasIndex(e => e.PublicId).IsUnique();
            entity.HasIndex(e => e.WorkspaceId);
        });

        modelBuilder.Entity<Submission>(entity =>
        {
            entity.HasIndex(e => e.FormId);
            entity.HasIndex(e => e.Status);
            entity.HasOne(e => e.Form)
                  .WithMany(f => f.Submissions)
                  .HasForeignKey(e => e.FormId);
        });

        modelBuilder.Entity<Setting>(entity =>
        {
            entity.HasIndex(e => e.Key).IsUnique();
        });

        modelBuilder.Entity<OAuthState>(entity =>
        {
            entity.HasIndex(e => e.State).IsUnique();
            entity.HasIndex(e => e.CreatedAt);
        });
    }
}
