using System.Text.Json;
using Backend.Auth;
using Backend.Data;
using Backend.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.WorkspaceAccess;

public class WorkspaceAccessService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IDbContextFactory<AppDbContext> _dbFactory;

    public WorkspaceAccessService(IDbContextFactory<AppDbContext> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    /// <summary>
    /// Builds the current authenticated user payload including workspace access flags.
    /// </summary>
    public async Task<UserDto?> GetUserDto(Guid userId)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return null;

        var hasFormsAccess = await EvaluateAccess(db, user);
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            AvatarUrl = user.AvatarUrl,
            WorkspaceId = user.AworkWorkspaceId,
            WorkspaceName = user.WorkspaceName,
            WorkspaceUrl = user.WorkspaceUrl,
            HasRefreshToken = !string.IsNullOrEmpty(user.RefreshToken),
            IsAworkAdmin = user.IsAworkAdmin,
            CanManageWorkspaceAccess = user.CanManageWorkspaceAccess,
            HasFormsAccess = hasFormsAccess
        };
    }

    /// <summary>
    /// Checks whether the given user may access the Forms application.
    /// </summary>
    public async Task<bool> HasFormsAccess(Guid userId)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return false;

        return await EvaluateAccess(db, user);
    }

    /// <summary>
    /// Returns the workspace access settings for a user with override permissions.
    /// </summary>
    public async Task<WorkspaceAccessSettingsDto> GetSettings(Guid userId)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null || !HasOverrideAccess(user))
            throw new UnauthorizedAccessException("Workspace access settings require workspace-manage-config permissions.");

        var policy = await db.WorkspaceAccessPolicies.AsNoTracking()
            .FirstOrDefaultAsync(p => p.WorkspaceId == user.AworkWorkspaceId);

        return MapSettings(policy);
    }

    /// <summary>
    /// Updates the workspace access settings for a user with override permissions.
    /// </summary>
    public async Task<WorkspaceAccessSettingsDto> UpdateSettings(Guid userId, UpdateWorkspaceAccessSettingsRequest request)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null || !HasOverrideAccess(user))
            throw new UnauthorizedAccessException("Workspace access settings require workspace-manage-config permissions.");

        var policy = await db.WorkspaceAccessPolicies
            .FirstOrDefaultAsync(p => p.WorkspaceId == user.AworkWorkspaceId);

        var allowedUserIds = (request.AllowedUserIds ?? [])
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        var now = DateTime.UtcNow;
        if (policy == null)
        {
            policy = new WorkspaceAccessPolicy
            {
                WorkspaceId = user.AworkWorkspaceId,
                CreatedAt = now
            };
            db.WorkspaceAccessPolicies.Add(policy);
        }

        policy.AllowAllUsers = request.AllowAllUsers;
        policy.AllowedUserIdsJson = request.AllowAllUsers
            ? "[]"
            : JsonSerializer.Serialize(allowedUserIds, JsonOptions);
        policy.UpdatedAt = now;

        await db.SaveChangesAsync();
        return MapSettings(policy);
    }

    private static async Task<bool> EvaluateAccess(AppDbContext db, User user)
    {
        if (HasOverrideAccess(user))
            return true;

        var policy = await db.WorkspaceAccessPolicies.AsNoTracking()
            .FirstOrDefaultAsync(p => p.WorkspaceId == user.AworkWorkspaceId);

        if (policy == null || policy.AllowAllUsers)
            return true;

        return GetAllowedUserIds(policy).Contains(user.AworkUserId);
    }

    private static WorkspaceAccessSettingsDto MapSettings(WorkspaceAccessPolicy? policy)
    {
        if (policy == null)
        {
            return new WorkspaceAccessSettingsDto
            {
                AllowAllUsers = true
            };
        }

        return new WorkspaceAccessSettingsDto
        {
            AllowAllUsers = policy.AllowAllUsers,
            AllowedUserIds = GetAllowedUserIds(policy).ToList()
        };
    }

    private static HashSet<Guid> GetAllowedUserIds(WorkspaceAccessPolicy policy)
    {
        try
        {
            var userIds = JsonSerializer.Deserialize<List<Guid>>(policy.AllowedUserIdsJson, JsonOptions) ?? [];
            return userIds.Where(id => id != Guid.Empty).ToHashSet();
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static bool HasOverrideAccess(User user) =>
        user.IsAworkAdmin || user.CanManageWorkspaceAccess;
}
