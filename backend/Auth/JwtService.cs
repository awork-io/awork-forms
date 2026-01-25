using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Auth;

public class JwtService
{
    private readonly string _secretKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expirationDays;

    public JwtService(string? secretKey = null, string issuer = "awork-forms", string audience = "awork-forms-client", int expirationDays = 7)
    {
        // Generate a random key if not provided (for development)
        // In production, this should be configured via environment variables
        _secretKey = secretKey ?? GenerateSecretKey();
        _issuer = issuer;
        _audience = audience;
        _expirationDays = expirationDays;
    }

    private static string GenerateSecretKey()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    /// <summary>
    /// Generates a JWT token for the authenticated user
    /// </summary>
    public string GenerateToken(int userId, string aworkUserId, string workspaceId)
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim("awork_user_id", aworkUserId),
            new Claim("workspace_id", workspaceId),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(_expirationDays),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Validates a JWT token and returns the claims principal
    /// </summary>
    public ClaimsPrincipal? ValidateToken(string token)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));

        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = securityKey,
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5)
            }, out _);

            return principal;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Extracts user ID from claims principal
    /// </summary>
    public static int? GetUserId(ClaimsPrincipal? principal)
    {
        var userIdClaim = principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        return null;
    }

    /// <summary>
    /// Extracts awork user ID from claims principal
    /// </summary>
    public static string? GetAworkUserId(ClaimsPrincipal? principal)
    {
        return principal?.FindFirst("awork_user_id")?.Value;
    }

    /// <summary>
    /// Extracts workspace ID from claims principal
    /// </summary>
    public static string? GetWorkspaceId(ClaimsPrincipal? principal)
    {
        return principal?.FindFirst("workspace_id")?.Value;
    }
}
