using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Auth;

public sealed record FormOwnerTokenKeepaliveResult(
    int OwnersChecked,
    int Refreshed,
    int Failed,
    int SkippedWithoutRefreshToken);

public class FormOwnerTokenKeepaliveRunner
{
    private readonly IDbContextFactory<AppDbContext> _dbFactory;
    private readonly AuthService _authService;
    private readonly ILogger<FormOwnerTokenKeepaliveRunner> _logger;

    public FormOwnerTokenKeepaliveRunner(
        IDbContextFactory<AppDbContext> dbFactory,
        AuthService authService,
        ILogger<FormOwnerTokenKeepaliveRunner> logger)
    {
        _dbFactory = dbFactory;
        _authService = authService;
        _logger = logger;
    }

    public async Task<FormOwnerTokenKeepaliveResult> RefreshActiveFormOwnerTokens(CancellationToken cancellationToken = default)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
        var owners = await db.Forms
            .Where(form => form.IsActive && form.CreatedBy != null)
            .Select(form => form.CreatedBy!.Value)
            .Distinct()
            .Join(
                db.Users,
                ownerId => ownerId,
                user => user.Id,
                (ownerId, user) => new
                {
                    OwnerId = ownerId,
                    user.RefreshToken
                })
            .ToListAsync(cancellationToken);

        var refreshed = 0;
        var failed = 0;
        var skippedWithoutRefreshToken = 0;

        foreach (var owner in owners)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (string.IsNullOrWhiteSpace(owner.RefreshToken))
            {
                skippedWithoutRefreshToken++;
                continue;
            }

            var accessToken = await _authService.GetValidAccessToken(owner.OwnerId, forceRefresh: true);
            if (string.IsNullOrEmpty(accessToken))
            {
                failed++;
                _logger.LogWarning("Failed to refresh awork token for form owner {OwnerId}", owner.OwnerId);
                continue;
            }

            refreshed++;
        }

        if (owners.Count > 0)
        {
            _logger.LogInformation(
                "Form owner token keepalive finished. Checked {Checked}, refreshed {Refreshed}, failed {Failed}, skipped {Skipped}.",
                owners.Count,
                refreshed,
                failed,
                skippedWithoutRefreshToken);
        }

        return new FormOwnerTokenKeepaliveResult(
            owners.Count,
            refreshed,
            failed,
            skippedWithoutRefreshToken);
    }
}

public class FormOwnerTokenKeepaliveService : BackgroundService
{
    private readonly FormOwnerTokenKeepaliveRunner _runner;
    private readonly ILogger<FormOwnerTokenKeepaliveService> _logger;
    private readonly TimeSpan _interval;

    public FormOwnerTokenKeepaliveService(
        FormOwnerTokenKeepaliveRunner runner,
        ILogger<FormOwnerTokenKeepaliveService> logger,
        TimeSpan interval)
    {
        _runner = runner;
        _logger = logger;
        _interval = interval;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_interval);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await _runner.RefreshActiveFormOwnerTokens(stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // shutdown
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Form owner token keepalive service failed.");
        }
    }
}
