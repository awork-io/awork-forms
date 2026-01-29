using System.Net;
using Xunit;

namespace Backend.Tests.Integration;

[Collection("Integration")]
public class AworkEndpointsTests
{
    private readonly IntegrationTestFactory _factory;

    public AworkEndpointsTests(IntegrationTestFactory factory)
    {
        _factory = factory;
    }

    public static IEnumerable<object[]> AworkEndpoints =>
    [
        ["/api/awork/projects", IntegrationTestFactory.AworkProjectId.ToString()],
        ["/api/awork/projecttypes", IntegrationTestFactory.AworkProjectTypeId.ToString()],
        ["/api/awork/users", IntegrationTestFactory.AworkUserId.ToString()],
        [$"/api/awork/projects/{IntegrationTestFactory.AworkProjectId}/taskstatuses", IntegrationTestFactory.AworkTaskStatusId.ToString()],
        [$"/api/awork/projects/{IntegrationTestFactory.AworkProjectId}/tasklists", IntegrationTestFactory.AworkTaskListId.ToString()],
        ["/api/awork/typesofwork", IntegrationTestFactory.AworkTypeOfWorkId.ToString()],
        [$"/api/awork/projects/{IntegrationTestFactory.AworkProjectId}/customfields", IntegrationTestFactory.AworkCustomFieldId.ToString()],
        [$"/api/awork/projecttypes/{IntegrationTestFactory.AworkProjectTypeId}/projectstatuses", IntegrationTestFactory.AworkProjectStatusId.ToString()]
    ];

    [Theory]
    [MemberData(nameof(AworkEndpoints))]
    public async Task AworkEndpoints_ReturnStubbedIds(string path, string expectedId)
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var client = _factory.CreateAuthenticatedClient(token);

        var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(expectedId, body);
    }
}
