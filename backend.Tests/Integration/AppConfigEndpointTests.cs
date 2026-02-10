using System.Net;

namespace Backend.Tests.Integration;

[Collection("Integration")]
public class AppConfigEndpointTests
{
    private readonly IntegrationTestFactory _factory;

    public AppConfigEndpointTests(IntegrationTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task AppConfigEndpoint_ReturnsJsonPayload()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/app-config");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("sentryDsn", body);
    }
}
