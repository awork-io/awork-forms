using Backend.Observability;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Backend.Tests;

public class SentrySettingsTests
{
    private static IConfiguration BuildConfiguration(Dictionary<string, string?> values)
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
    }

    [Fact]
    public void FromConfiguration_WithoutDsn_DisablesSentry()
    {
        var config = BuildConfiguration(new Dictionary<string, string?>
        {
            ["Sentry:Dsn"] = ""
        });
        var settings = SentrySettings.FromConfiguration(config, new TestHostEnvironment("Development"));

        Assert.False(settings.IsEnabled);
        Assert.Equal("Development", settings.Environment);
        Assert.False(settings.SendDefaultPii);
    }

    [Fact]
    public void FromConfiguration_WithDsn_EnablesSentry()
    {
        var config = BuildConfiguration(new Dictionary<string, string?>
        {
            ["Sentry:Dsn"] = "https://key@o0.ingest.sentry.io/1",
            ["Sentry:Environment"] = "Production",
            ["Sentry:Release"] = "awork-forms@1.2.3",
            ["Sentry:SendDefaultPii"] = "true"
        });
        var settings = SentrySettings.FromConfiguration(config, new TestHostEnvironment("Development"));

        Assert.True(settings.IsEnabled);
        Assert.Equal("Production", settings.Environment);
        Assert.Equal("awork-forms@1.2.3", settings.Release);
        Assert.True(settings.SendDefaultPii);
    }

    private sealed class TestHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;
        public string ApplicationName { get; set; } = "backend-tests";
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.PhysicalFileProvider(Directory.GetCurrentDirectory());
    }
}
