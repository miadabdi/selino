import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { notifications } from "./notifications.schema.js";

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  notificationId: integer("notification_id")
    .notNull()
    .references(() => notifications.id, { onDelete: "cascade" }),

  channel: varchar("channel", { length: 50 }).notNull(), // sms, email, push, in_app
  destination: varchar("destination", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull(), // pending, sent, failed
  error: text("error"),
});

export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDelivery =
  typeof notificationDeliveries.$inferInsert;
