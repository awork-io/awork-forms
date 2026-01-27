using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    public partial class AddFormTranslations : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DescriptionTranslationsJson",
                table: "Forms",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NameTranslationsJson",
                table: "Forms",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DescriptionTranslationsJson",
                table: "Forms");

            migrationBuilder.DropColumn(
                name: "NameTranslationsJson",
                table: "Forms");
        }
    }
}
