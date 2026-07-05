import {
  AnyPgColumn,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { files } from "./files.schema";

export const businessAccountTypeEnum = pgEnum("business_account_type", [
  "store",
  "company",
]);

export const businessAccounts = pgTable("business_accounts", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  type: businessAccountTypeEnum("type").notNull().default("store"),
  description: text("description"),
  logoFileId: integer("logo_file_id").references((): AnyPgColumn => files.id, {
    onDelete: "set null",
  }),
});

export type BusinessAccount = typeof businessAccounts.$inferSelect;
export type NewBusinessAccount = typeof businessAccounts.$inferInsert;
