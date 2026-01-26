using Backend.Auth;
using Xunit;

namespace Backend.Tests;

public class JwtServiceTests
{
    private readonly JwtService _jwtService;

    public JwtServiceTests()
    {
        // Use a fixed secret key for predictable testing
        _jwtService = new JwtService("test-secret-key-for-unit-testing-32chars!");
    }

    [Fact]
    public void GenerateToken_ReturnsValidJwtToken()
    {
        // Arrange
        var userId = 123;
        var aworkUserId = "awork-user-456";
        var workspaceId = "workspace-789";

        // Act
        var token = _jwtService.GenerateToken(userId, aworkUserId, workspaceId);

        // Assert
        Assert.NotNull(token);
        Assert.NotEmpty(token);
        Assert.Contains(".", token); // JWT tokens have dots separating parts
    }

    [Fact]
    public void ValidateToken_WithValidToken_ReturnsClaimsPrincipal()
    {
        // Arrange
        var userId = 123;
        var aworkUserId = "awork-user-456";
        var workspaceId = "workspace-789";
        var token = _jwtService.GenerateToken(userId, aworkUserId, workspaceId);

        // Act
        var principal = _jwtService.ValidateToken(token);

        // Assert
        Assert.NotNull(principal);
    }

    [Fact]
    public void ValidateToken_WithInvalidToken_ReturnsNull()
    {
        // Arrange
        var invalidToken = "invalid.token.here";

        // Act
        var principal = _jwtService.ValidateToken(invalidToken);

        // Assert
        Assert.Null(principal);
    }

    [Fact]
    public void ValidateToken_WithTamperedToken_ReturnsNull()
    {
        // Arrange
        var userId = 123;
        var token = _jwtService.GenerateToken(userId, "awork-user", "workspace");
        var tamperedToken = token + "tampered";

        // Act
        var principal = _jwtService.ValidateToken(tamperedToken);

        // Assert
        Assert.Null(principal);
    }

    [Fact]
    public void GetUserId_WithValidPrincipal_ReturnsUserId()
    {
        // Arrange
        var userId = 123;
        var token = _jwtService.GenerateToken(userId, "awork-user", "workspace");
        var principal = _jwtService.ValidateToken(token);

        // Act
        var extractedUserId = JwtService.GetUserId(principal);

        // Assert
        Assert.NotNull(extractedUserId);
        Assert.Equal(userId, extractedUserId);
    }

    [Fact]
    public void GetAworkUserId_WithValidPrincipal_ReturnsAworkUserId()
    {
        // Arrange
        var aworkUserId = "awork-user-456";
        var token = _jwtService.GenerateToken(1, aworkUserId, "workspace");
        var principal = _jwtService.ValidateToken(token);

        // Act
        var extractedAworkUserId = JwtService.GetAworkUserId(principal);

        // Assert
        Assert.Equal(aworkUserId, extractedAworkUserId);
    }

    [Fact]
    public void GetWorkspaceId_WithValidPrincipal_ReturnsWorkspaceId()
    {
        // Arrange
        var workspaceId = "workspace-789";
        var token = _jwtService.GenerateToken(1, "awork-user", workspaceId);
        var principal = _jwtService.ValidateToken(token);

        // Act
        var extractedWorkspaceId = JwtService.GetWorkspaceId(principal);

        // Assert
        Assert.Equal(workspaceId, extractedWorkspaceId);
    }

    [Fact]
    public void GetUserId_WithNullPrincipal_ReturnsNull()
    {
        // Act
        var userId = JwtService.GetUserId(null);

        // Assert
        Assert.Null(userId);
    }

    [Fact]
    public void GenerateToken_WithDifferentUsers_GeneratesDifferentTokens()
    {
        // Arrange & Act
        var token1 = _jwtService.GenerateToken(1, "user1", "workspace1");
        var token2 = _jwtService.GenerateToken(2, "user2", "workspace2");

        // Assert
        Assert.NotEqual(token1, token2);
    }

    [Fact]
    public void JwtService_WithoutSecretKey_GeneratesRandomKey()
    {
        // Arrange
        var service1 = new JwtService();
        var service2 = new JwtService();

        // Act
        var token1 = service1.GenerateToken(1, "user", "workspace");
        var token2 = service2.GenerateToken(1, "user", "workspace");

        // Assert - tokens should be different because keys are different
        Assert.NotEqual(token1, token2);

        // But each service should validate its own tokens
        Assert.NotNull(service1.ValidateToken(token1));
        Assert.NotNull(service2.ValidateToken(token2));

        // And should not validate other service's tokens
        Assert.Null(service1.ValidateToken(token2));
        Assert.Null(service2.ValidateToken(token1));
    }
}
