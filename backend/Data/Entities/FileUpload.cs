namespace Backend.Data.Entities;

public class FileUpload
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public Guid FormPublicId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long FileSize { get; set; }
    public byte[] Data { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}
