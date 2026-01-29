using Xunit;

namespace Backend.Tests.Integration;

[CollectionDefinition("Integration", DisableParallelization = true)]
public class IntegrationTestCollection : ICollectionFixture<IntegrationTestFactory>
{
}
