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
        var userId = Guid.NewGuid();
        var aworkUserId = Guid.NewGuid();
        var workspaceId = Guid.NewGuid();

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
        var userId = Guid.NewGuid();
        var aworkUserId = Guid.NewGuid();
        var workspaceId = Guid.NewGuid();
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
        var userId = Guid.NewGuid();
        var token = _jwtService.GenerateToken(userId, Guid.NewGuid(), Guid.NewGuid());
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
        var userId = Guid.NewGuid();
        var token = _jwtService.GenerateToken(userId, Guid.NewGuid(), Guid.NewGuid());
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
        var aworkUserId = Guid.NewGuid();
        var token = _jwtService.GenerateToken(Guid.NewGuid(), aworkUserId, Guid.NewGuid());
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
        var workspaceId = Guid.NewGuid();
        var token = _jwtService.GenerateToken(Guid.NewGuid(), Guid.NewGuid(), workspaceId);
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
        var token1 = _jwtService.GenerateToken(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        var token2 = _jwtService.GenerateToken(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

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
        var token1 = service1.GenerateToken(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        var token2 = service2.GenerateToken(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

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
