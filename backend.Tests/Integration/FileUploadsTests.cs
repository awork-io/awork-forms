using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Backend.Forms;
using Xunit;

namespace Backend.Tests.Integration;

[Collection("Integration")]
public class FileUploadsTests
{
    private readonly IntegrationTestFactory _factory;

    public FileUploadsTests(IntegrationTestFactory factory)
    {
        _factory = factory;
    }

    private sealed class UploadResponse
    {
        public string FileName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public long FileSize { get; set; }
    }

    [Fact]
    public async Task UploadAndDownloadFile_RoundTripsContent()
    {
        var (_, token) = await _factory.SeedUserAsync();
        using var client = _factory.CreateAuthenticatedClient(token);

        var createDto = new CreateFormDto
        {
            Name = "Upload Form",
            FieldsJson = "[]",
            IsActive = true
        };

        var createResponse = await client.PostAsJsonAsync("/api/forms", createDto);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<FormDetailDto>();
        Assert.NotNull(created);

        var fileBytes = Encoding.UTF8.GetBytes("hello upload");
        using var formContent = new MultipartFormDataContent();
        using var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
        formContent.Add(fileContent, "file", "hello.txt");

        var uploadResponse = await client.PostAsync($"/api/f/{created!.PublicId}/upload", formContent);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        var upload = await uploadResponse.Content.ReadFromJsonAsync<UploadResponse>();
        Assert.NotNull(upload);
        Assert.Equal("hello.txt", upload!.FileName);
        Assert.Contains("/api/files/", upload.FileUrl);

        var downloadResponse = await client.GetAsync(upload.FileUrl);
        Assert.Equal(HttpStatusCode.OK, downloadResponse.StatusCode);

        var downloaded = await downloadResponse.Content.ReadAsByteArrayAsync();
        Assert.Equal(fileBytes, downloaded);
        Assert.Equal("text/plain", downloadResponse.Content.Headers.ContentType?.MediaType);
    }
}
