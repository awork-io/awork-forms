using System.Reflection;

namespace Backend.Endpoints;

public static class EndpointExtensions
{
    public static void MapEndpoints(this IEndpointRouteBuilder app)
    {
        var endpointTypes = Assembly.GetExecutingAssembly()
            .GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract && t.GetInterfaces().Contains(typeof(IEndpoint)));

        foreach (var type in endpointTypes)
        {
            var method = type.GetMethod("Map", BindingFlags.Static | BindingFlags.Public);
            method?.Invoke(null, [app]);
        }
    }
}
