using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkspaceAccessControl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CanManageWorkspaceAccess",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsAworkAdmin",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "WorkspaceAccessPolicies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorkspaceId = table.Column<Guid>(type: "uuid", nullable: false),
                    AllowAllUsers = table.Column<bool>(type: "boolean", nullable: false),
                    AllowedUserIdsJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkspaceAccessPolicies", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkspaceAccessPolicies_WorkspaceId",
                table: "WorkspaceAccessPolicies",
                column: "WorkspaceId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkspaceAccessPolicies");

            migrationBuilder.DropColumn(
                name: "CanManageWorkspaceAccess",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsAworkAdmin",
                table: "Users");
        }
    }
}
