import {
  AnyPgColumn,
  integer,
  pgTable,
  serial,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { features } from "./features.schema";
import { packages } from "./packages.schema";

export const packageFeatures = pgTable(
  "package_features",
  {
    id: serial("id").primaryKey(),
    packageId: integer("package_id")
      .notNull()
      .references((): AnyPgColumn => packages.id, { onDelete: "cascade" }),
    featureId: integer("feature_id")
      .notNull()
      .references((): AnyPgColumn => features.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("package_features_package_id_feature_id_idx").on(
      table.packageId,
      table.featureId,
    ),
  ],
);

export type PackageFeature = typeof packageFeatures.$inferSelect;
export type NewPackageFeature = typeof packageFeatures.$inferInsert;
