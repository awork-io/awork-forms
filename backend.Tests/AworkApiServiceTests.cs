using System.Net;
using Backend.Auth;
using Backend.Awork;
using Backend.Data;
using Backend.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Backend.Tests;

public class AworkApiServiceTests
{
    [Theory]
    [InlineData(false, "/api/v1/tasks")]
    [InlineData(true, "/api/v1/tasks?skipCreatorAsWatcher=true")]
    public async Task CreateTask_OnlySendsWatcherOptOutWhenEnabled(bool skipCreatorAsWatcher, string expectedPath)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var dbFactory = new TestDbContextFactory(options);
        var userId = Guid.NewGuid();
        using (var db = dbFactory.CreateDbContext())
        {
            db.Users.Add(new User
            {
                Id = userId,
                AworkUserId = Guid.NewGuid(),
                AworkWorkspaceId = Guid.NewGuid(),
                AccessToken = "test-access-token",
                TokenExpiresAt = DateTime.UtcNow.AddHours(1)
            });
            await db.SaveChangesAsync();
        }

        using var handler = new CaptureHandler();
        using var httpClient = new HttpClient(handler);
        var authService = new AuthService(httpClient, dbFactory,
            new JwtService("unit-tests-secret-should-be-32-bytes-min"), "https://forms.test/callback");
        var apiService = new AworkApiService(httpClient, authService, "https://awork.test/api/v1");

        await apiService.CreateTask(userId, Guid.NewGuid(), new AworkCreateTaskRequest(), skipCreatorAsWatcher);

        Assert.Equal(expectedPath, handler.RequestUri?.PathAndQuery);
    }

    private sealed class CaptureHandler : HttpMessageHandler
    {
        public Uri? RequestUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestUri = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{}")
            });
        }
    }
}
