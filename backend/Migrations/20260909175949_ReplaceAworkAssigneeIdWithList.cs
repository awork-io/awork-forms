using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceAworkAssigneeIdWithList : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<Guid>>(
                name: "AworkAssigneeIds",
                table: "Forms",
                type: "uuid[]",
                nullable: false,
                defaultValueSql: "'{}'::uuid[]");

            // Carry the single configured assignee over into the new list before dropping the old column.
            migrationBuilder.Sql(
                """
                UPDATE "Forms"
                SET "AworkAssigneeIds" = ARRAY["AworkAssigneeId"]
                WHERE "AworkAssigneeId" IS NOT NULL;
                """);

            migrationBuilder.DropColumn(
                name: "AworkAssigneeId",
                table: "Forms");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AworkAssigneeId",
                table: "Forms",
                type: "uuid",
                nullable: true);

            // Only the first assignee survives a rollback.
            migrationBuilder.Sql(
                """
                UPDATE "Forms"
                SET "AworkAssigneeId" = "AworkAssigneeIds"[1]
                WHERE cardinality("AworkAssigneeIds") > 0;
                """);

            migrationBuilder.DropColumn(
                name: "AworkAssigneeIds",
                table: "Forms");
        }
    }
}
