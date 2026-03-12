using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddFormOwnershipAndSharing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Forms",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsSharedWithWorkspace",
                table: "Forms",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Forms",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Forms"
                SET "IsSharedWithWorkspace" = TRUE;
                """);

            migrationBuilder.Sql("""
                UPDATE "Forms" AS f
                SET
                    "CreatedBy" = owner."Id",
                    "UpdatedBy" = owner."Id"
                FROM (
                    SELECT DISTINCT ON (u."AworkWorkspaceId")
                        u."AworkWorkspaceId",
                        u."Id"
                    FROM "Users" AS u
                    ORDER BY u."AworkWorkspaceId", u."CreatedAt", u."Id"
                ) AS owner
                WHERE owner."AworkWorkspaceId" = f."WorkspaceId";
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Forms_WorkspaceId_IsSharedWithWorkspace_CreatedBy",
                table: "Forms",
                columns: new[] { "WorkspaceId", "IsSharedWithWorkspace", "CreatedBy" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Forms_WorkspaceId_IsSharedWithWorkspace_CreatedBy",
                table: "Forms");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Forms");

            migrationBuilder.DropColumn(
                name: "IsSharedWithWorkspace",
                table: "Forms");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Forms");
        }
    }
}
