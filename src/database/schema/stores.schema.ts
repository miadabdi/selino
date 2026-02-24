import {
  AnyPgColumn,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { files } from "./files.schema";
import { users } from "./users.schema";

export const stores = pgTable("stores", {
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
  description: text("description"),
  logoFileId: integer("logo_file_id").references((): AnyPgColumn => files.id, {
    onDelete: "set null",
  }),

  ownerId: integer("owner_id").references((): AnyPgColumn => users.id, {
    onDelete: "set null",
  }),
});

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
