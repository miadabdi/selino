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
import { businessAccounts } from "./business-accounts.schema";

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  userId: integer("user_id")
    .notNull()
    .references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
  businessAccountId: integer("business_account_id").references(
    (): AnyPgColumn => businessAccounts.id,
    { onDelete: "cascade" },
  ),

  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }),
  body: text("body"),
  payload: text("payload"),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
