import {
  AnyPgColumn,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  userId: integer("user_id")
    .notNull()
    .references((): AnyPgColumn => users.id, { onDelete: "cascade" }),

  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }),
  body: text("body"),
  payload: text("payload"),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
