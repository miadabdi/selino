import { integer, pgTable, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { permissions } from "./permissions.schema";
import { roles } from "./roles.schema";

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: serial("id").primaryKey(),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("role_permissions_role_id_permission_id_idx").on(
      table.roleId,
      table.permissionId,
    ),
  ],
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
