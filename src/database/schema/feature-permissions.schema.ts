import {
  AnyPgColumn,
  integer,
  pgTable,
  serial,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { features } from "./features.schema";
import { permissions } from "./permissions.schema";

export const featurePermissions = pgTable(
  "feature_permissions",
  {
    id: serial("id").primaryKey(),
    featureId: integer("feature_id")
      .notNull()
      .references((): AnyPgColumn => features.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id")
      .notNull()
      .references((): AnyPgColumn => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("feature_permissions_feature_id_permission_id_idx").on(
      table.featureId,
      table.permissionId,
    ),
  ],
);

export type FeaturePermission = typeof featurePermissions.$inferSelect;
export type NewFeaturePermission = typeof featurePermissions.$inferInsert;
