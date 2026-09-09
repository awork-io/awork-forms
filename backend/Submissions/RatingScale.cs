using System.Globalization;
using System.Text.Json;

namespace Backend.Submissions;

// Mirrors frontend/src/lib/form-types.ts (getRatingMin/getRatingMax) so that the server
// enforces the same scale the public form renders.
internal static class RatingScale
{
    public const int MinScale = 3;
    public const int MaxScale = 10;
    public const int DefaultScale = 5;

    public static int GetMax(FormFieldInfo field)
    {
        if (field.RatingMax is not int max) return DefaultScale;
        return Math.Clamp(max, MinScale, MaxScale);
    }

    public static int GetMin(FormFieldInfo field)
    {
        return field.RatingStyle == "numbers" && field.RatingMin == 0 ? 0 : 1;
    }

    public static string FormatDisplayValue(FormFieldInfo field, string rawValue)
    {
        return $"{rawValue}/{GetMax(field)}";
    }

    // Returns null when the value is acceptable; otherwise a human-readable reason.
    public static string? Validate(FormFieldInfo field, object? value)
    {
        if (value == null) return null;

        int? rating = value switch
        {
            JsonElement { ValueKind: JsonValueKind.Null } => null,
            JsonElement { ValueKind: JsonValueKind.String } element => ParseInt(element.GetString()),
            JsonElement { ValueKind: JsonValueKind.Number } element => element.TryGetInt32(out var n) ? n : -1,
            JsonElement => -1,
            string text => ParseInt(text),
            int n => n,
            long n => n is >= int.MinValue and <= int.MaxValue ? (int)n : -1,
            double d => d == Math.Floor(d) ? (int)d : -1,
            _ => -1
        };

        // Empty string / null = not answered; required-ness is enforced by the form UI.
        if (rating == null) return null;

        var min = GetMin(field);
        var max = GetMax(field);
        if (rating < min || rating > max)
            return $"Invalid value for '{field.Label}': expected a whole number between {min} and {max}";

        return null;
    }

    private static int? ParseInt(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        return int.TryParse(text.Trim(), NumberStyles.None, CultureInfo.InvariantCulture, out var n) ? n : -1;
    }
}
