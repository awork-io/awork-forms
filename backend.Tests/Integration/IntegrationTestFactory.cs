using System.Net.Http.Headers;
using System.Net.Http.Json;
using Backend.Auth;
using Backend.Data;
using Backend.Data.Entities;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Testcontainers.PostgreSql;

namespace Backend.Tests.Integration;

public sealed class IntegrationTestFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string JwtSecret = "integration-tests-secret-should-be-32-bytes-min";
    private const int WireMockPort = 8080;
    private readonly PostgreSqlContainer _dbContainer = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("awork_forms")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();
    private readonly IContainer _aworkContainer = new ContainerBuilder()
        .WithImage("wiremock/wiremock:3.5.2")
        .WithPortBinding(WireMockPort, true)
        .Build();

    public static readonly Guid AworkProjectId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid AworkProjectTypeId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid AworkProjectStatusId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    public static readonly Guid AworkTaskStatusId = Guid.Parse("44444444-4444-4444-4444-444444444444");
    public static readonly Guid AworkTaskListId = Guid.Parse("55555555-5555-5555-5555-555555555555");
    public static readonly Guid AworkTypeOfWorkId = Guid.Parse("66666666-6666-6666-6666-666666666666");
    public static readonly Guid AworkCustomFieldId = Guid.Parse("77777777-7777-7777-7777-777777777777");
    public static readonly Guid AworkUserId = Guid.Parse("88888888-8888-8888-8888-888888888888");
    public static readonly Guid AworkCreatedProjectId = Guid.Parse("99999999-9999-9999-9999-999999999999");
    public static readonly Guid AworkCreatedTaskId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    public string AworkApiBaseUrl { get; private set; } = string.Empty;
    private string AworkAdminBaseUrl { get; set; } = string.Empty;
    private bool _aworkStubsConfigured;

    public async Task InitializeAsync()
    {
        EnsureContainersStarted();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await _dbContainer.DisposeAsync();
        await _aworkContainer.DisposeAsync();
        await base.DisposeAsync();
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        EnsureContainersStarted();
        Environment.SetEnvironmentVariable("DATABASE_URL", _dbContainer.GetConnectionString());
        Environment.SetEnvironmentVariable("JWT_SECRET_KEY", JwtSecret);
        Environment.SetEnvironmentVariable("AWORK_API_BASE_URL", AworkApiBaseUrl);
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");
        return base.CreateHost(builder);
    }

    public async Task<(User user, string token)> SeedUserAsync()
    {
        using var scope = Services.CreateScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<AppDbContext>>();
        await using var db = await dbFactory.CreateDbContextAsync();

        var user = new User
        {
            Id = Guid.NewGuid(),
            AworkUserId = Guid.NewGuid(),
            AworkWorkspaceId = Guid.NewGuid(),
            Email = "integration@test.local",
            Name = "Integration User",
            AccessToken = "access-token",
            RefreshToken = "refresh-token",
            TokenExpiresAt = DateTime.UtcNow.AddHours(1),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = new JwtService(JwtSecret).GenerateToken(user.Id, user.AworkUserId, user.AworkWorkspaceId);
        return (user, token);
    }

    public HttpClient CreateAuthenticatedClient(string token)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task ConfigureAworkStubsAsync()
    {
        using var client = new HttpClient { BaseAddress = new Uri(AworkAdminBaseUrl) };
        await WaitForWireMockAsync(client);

        await RegisterAworkMappingAsync(client, new
        {
            request = new { method = "GET", urlPath = "/api/v1/projects" },
            response = new
            {
                status = 200,
                jsonBody = new[]
                {
                    new { id = AworkProjectId, name = "Alpha Project", projectTypeId = AworkProjectTypeId }
                }
            }
        });

        await RegisterAworkMappingAsync(client, new
        {
            request = new { method = "GET", urlPath = "/api/v1/projecttypes" },
            response = new
            {
                status = 200,
                jsonBody = new[]
                {
                    new { id = AworkProjectTypeId, name = "Delivery", isPreset = true }
                }
            }
        });

        await RegisterAworkMappingAsync(client, new
        {
            request = new { method = "GET", urlPath = "/api/v1/users" },
            response = new
            {
                status = 200,
                jsonBody = new[]
                {
                    new { id = AworkUserId, firstName = "Ada", lastName = "Lovelace", email = "ada@test.local" }
                }
            }
        });

        await RegisterAworkMappingAsync(client, new
        {
            request = new { method = "GET", urlPath = $"/api/v1/projects/{AworkProjectId}/taskstatuses" },
            response = new
            {
                status = 200,
                jsonBody = new[]
                {
                    new { id = AworkTaskStatusId, name = "Todo", type = "todo", order = 1 }
                }
            }
        });

        await RegisterAworkMappingAsync(client, new
        {
            request = new { method = "GET", urlPath = $"/api/v1/projects/{AworkProjectId}/tasklists" },
            response = new
            {
                status = 200,
                jsonBody = new[]
                {
                    new { id = AworkTaskListId, name = "Backlog", order = 1, orderOfNewTasks = 1 }
                }
            }
        });

        await RegisterAworkMappingAsync(client, new
        {
            request = new { method = "GET", urlPath = "/api/v1/typeofwork" },
            response = new
            {
                status = 200,
                jsonBody = new[]
                {
                    new { id = AworkTypeOfWorkId, name = "Bugfix", isArchived = false }
                }
            }
        });

        await RegisterAworkMappingAsync(client, new
        {
            request = new { method = "GET", urlPathPattern = "/api/v1/projects/.+/customfielddefinitions" },
            response = new
            {
                status = 200,
                jsonBody = new[]
                {
                    new { id = AworkCustomFieldId, name = "Severity", type = "text", entity = "task", isRequired = false, isArchived = false }
                }
            }
        });

        await RegisterAworkMappingAsync(client, new
        {
            request = new { method = "GET", urlPath = $"/api/v1/projecttypes/{AworkProjectTypeId}/projectstatuses" },
            response = new
            {
                status = 200,
                jsonBody = new[]
                {
                    new { id = AworkProjectStatusId, name = "Active", type = "open", order = 1 }
                }
            }
        });

        await RegisterAworkMappingAsync(client, new
        {
            request = new { method = "POST", urlPath = "/api/v1/projects" },
            response = new
            {
                status = 200,
                jsonBody = new { id = AworkCreatedProjectId, name = "Created Project" }
            }
        });

        await RegisterAworkMappingAsync(client, new
        {
            request = new { method = "POST", urlPath = "/api/v1/tasks" },
            response = new
            {
                status = 200,
                jsonBody = new { id = AworkCreatedTaskId, name = "Created Task" }
            }
        });

        await RegisterAworkMappingAsync(client, new
        {
            request = new { method = "POST", urlPath = $"/api/v1/tasks/{AworkCreatedTaskId}/setassignees" },
            response = new { status = 200, jsonBody = new { ok = true } }
        });

        await RegisterAworkMappingAsync(client, new
        {
            request = new { method = "POST", urlPath = $"/api/v1/tasks/{AworkCreatedTaskId}/addtags" },
            response = new { status = 200, jsonBody = new { ok = true } }
        });
    }

    private void EnsureContainersStarted()
    {
        if (_dbContainer.State != TestcontainersStates.Running)
            _dbContainer.StartAsync().GetAwaiter().GetResult();

        if (_aworkContainer.State != TestcontainersStates.Running)
            _aworkContainer.StartAsync().GetAwaiter().GetResult();

        var host = _aworkContainer.Hostname;
        var port = _aworkContainer.GetMappedPublicPort(WireMockPort);
        AworkAdminBaseUrl = $"http://{host}:{port}";
        AworkApiBaseUrl = $"{AworkAdminBaseUrl}/api/v1";

        if (!_aworkStubsConfigured)
        {
            ConfigureAworkStubsAsync().GetAwaiter().GetResult();
            _aworkStubsConfigured = true;
        }
    }

    private static async Task RegisterAworkMappingAsync(HttpClient client, object mapping)
    {
        var response = await client.PostAsJsonAsync("/__admin/mappings", mapping);
        response.EnsureSuccessStatusCode();
    }

    private static async Task WaitForWireMockAsync(HttpClient client)
    {
        var attempts = 0;
        while (true)
        {
            attempts++;
            try
            {
                var response = await client.GetAsync("/__admin");
                if (response.IsSuccessStatusCode) return;
            }
            catch
            {
                // ignore and retry
            }

            if (attempts >= 10)
                throw new InvalidOperationException("WireMock did not become ready in time.");

            await Task.Delay(200);
        }
    }
}
