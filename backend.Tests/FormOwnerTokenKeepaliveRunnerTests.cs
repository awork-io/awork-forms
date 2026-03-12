using System.Net;
using System.Text;
using Backend.Auth;
using Backend.Data;
using Backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Backend.Tests;

public class FormOwnerTokenKeepaliveRunnerTests
{
    [Fact]
    public async Task RefreshActiveFormOwnerTokens_RefreshesDistinctActiveOwners()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbFactory = new TestDbContextFactory(options);
        var workspaceId = Guid.NewGuid();
        var refreshableOwnerId = Guid.NewGuid();
        var skippedOwnerId = Guid.NewGuid();
        var inactiveOwnerId = Guid.NewGuid();

        using (var db = dbFactory.CreateDbContext())
        {
            db.Users.AddRange(
                new User
                {
                    Id = refreshableOwnerId,
                    AworkUserId = Guid.NewGuid(),
                    AworkWorkspaceId = workspaceId,
                    Email = "refreshable@test.local",
                    Name = "Refreshable Owner",
                    AccessToken = "expired-owner-token",
                    RefreshToken = "refreshable-owner-refresh-token",
                    TokenExpiresAt = DateTime.UtcNow.AddMinutes(-10),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new User
                {
                    Id = skippedOwnerId,
                    AworkUserId = Guid.NewGuid(),
                    AworkWorkspaceId = workspaceId,
                    Email = "skipped@test.local",
                    Name = "Skipped Owner",
                    AccessToken = "skipped-owner-token",
                    RefreshToken = null,
                    TokenExpiresAt = DateTime.UtcNow.AddMinutes(-10),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new User
                {
                    Id = inactiveOwnerId,
                    AworkUserId = Guid.NewGuid(),
                    AworkWorkspaceId = workspaceId,
                    Email = "inactive@test.local",
                    Name = "Inactive Owner",
                    AccessToken = "inactive-owner-token",
                    RefreshToken = "inactive-owner-refresh-token",
                    TokenExpiresAt = DateTime.UtcNow.AddMinutes(-10),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

            db.Forms.AddRange(
                new Form
                {
                    PublicId = Guid.NewGuid(),
                    WorkspaceId = workspaceId,
                    CreatedBy = refreshableOwnerId,
                    UpdatedBy = refreshableOwnerId,
                    Name = "Refreshable One",
                    FieldsJson = "[]",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Form
                {
                    PublicId = Guid.NewGuid(),
                    WorkspaceId = workspaceId,
                    CreatedBy = refreshableOwnerId,
                    UpdatedBy = refreshableOwnerId,
                    Name = "Refreshable Two",
                    FieldsJson = "[]",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Form
                {
                    PublicId = Guid.NewGuid(),
                    WorkspaceId = workspaceId,
                    CreatedBy = skippedOwnerId,
                    UpdatedBy = skippedOwnerId,
                    Name = "Skipped",
                    FieldsJson = "[]",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Form
                {
                    PublicId = Guid.NewGuid(),
                    WorkspaceId = workspaceId,
                    CreatedBy = inactiveOwnerId,
                    UpdatedBy = inactiveOwnerId,
                    Name = "Inactive",
                    FieldsJson = "[]",
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

            db.SaveChanges();
        }

        var handler = new StubAworkAuthHandler();
        var authService = new AuthService(
            new HttpClient(handler),
            dbFactory,
            new JwtService("01234567890123456789012345678901"),
            "http://localhost/auth/callback",
            "https://awork.test/api/v1");
        var runner = new FormOwnerTokenKeepaliveRunner(
            dbFactory,
            authService,
            NullLogger<FormOwnerTokenKeepaliveRunner>.Instance);

        var result = await runner.RefreshActiveFormOwnerTokens();

        Assert.Equal(2, result.OwnersChecked);
        Assert.Equal(1, result.Refreshed);
        Assert.Equal(0, result.Failed);
        Assert.Equal(1, result.SkippedWithoutRefreshToken);
        Assert.Equal(1, handler.TokenRefreshCalls);

        using var verifyDb = dbFactory.CreateDbContext();
        var refreshedOwner = await verifyDb.Users.SingleAsync(user => user.Id == refreshableOwnerId);
        Assert.Equal("refreshed-access-token", refreshedOwner.AccessToken);
        Assert.Equal("rotated-refresh-token", refreshedOwner.RefreshToken);

        var skippedOwner = await verifyDb.Users.SingleAsync(user => user.Id == skippedOwnerId);
        Assert.Equal("skipped-owner-token", skippedOwner.AccessToken);
        Assert.Null(skippedOwner.RefreshToken);

        var inactiveOwner = await verifyDb.Users.SingleAsync(user => user.Id == inactiveOwnerId);
        Assert.Equal("inactive-owner-token", inactiveOwner.AccessToken);
        Assert.Equal("inactive-owner-refresh-token", inactiveOwner.RefreshToken);
    }

    private sealed class StubAworkAuthHandler : HttpMessageHandler
    {
        public int TokenRefreshCalls { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.RequestUri?.AbsolutePath == "/api/v1/clientapplications/register")
            {
                return Task.FromResult(CreateJsonResponse("""{"client_id":"test-client-id","scope":"offline_access full_access"}"""));
            }

            if (request.RequestUri?.AbsolutePath == "/api/v1/accounts/token")
            {
                TokenRefreshCalls++;
                return Task.FromResult(CreateJsonResponse("""{"access_token":"refreshed-access-token","refresh_token":"rotated-refresh-token","expires_in":3600,"token_type":"Bearer"}"""));
            }

            throw new InvalidOperationException($"Unexpected request: {request.Method} {request.RequestUri}");
        }

        private static HttpResponseMessage CreateJsonResponse(string json)
        {
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
        }
    }
}
