namespace Backend.Observability;

public sealed record SentrySettings(
    string? Dsn,
    string Environment,
    string? Release,
    bool SendDefaultPii)
{
    public bool IsEnabled => !string.IsNullOrWhiteSpace(Dsn);

    public static SentrySettings FromConfiguration(IConfiguration configuration, IHostEnvironment hostEnvironment)
    {
        var dsn = GetValue(configuration, "Sentry:Dsn", "SENTRY_DSN");
        var environment = GetValue(configuration, "Sentry:Environment", "SENTRY_ENVIRONMENT")
            ?? hostEnvironment.EnvironmentName;
        var release = GetValue(configuration, "Sentry:Release", "SENTRY_RELEASE");
        var sendDefaultPiiRaw = GetValue(configuration, "Sentry:SendDefaultPii", "SENTRY_SEND_DEFAULT_PII");

        return new SentrySettings(
            Dsn: dsn,
            Environment: environment,
            Release: release,
            SendDefaultPii: ParseBool(sendDefaultPiiRaw, fallback: false)
        );
    }

    private static string? GetValue(IConfiguration configuration, string configKey, string envKey)
    {
        return configuration[configKey] ?? global::System.Environment.GetEnvironmentVariable(envKey);
    }

    private static bool ParseBool(string? value, bool fallback)
    {
        return bool.TryParse(value, out var parsed) ? parsed : fallback;
    }
}
