import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { notifications } from "./notifications.schema";

export const notificationDeliveryChannelEnum = pgEnum(
  "notification_delivery_channel",
  ["sms", "email", "push", "in_app"],
);

export const notificationDeliveryStatusEnum = pgEnum(
  "notification_delivery_status",
  ["pending", "sent", "failed"],
);

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  notificationId: integer("notification_id")
    .notNull()
    .references(() => notifications.id, { onDelete: "cascade" }),

  channel: notificationDeliveryChannelEnum("channel").notNull(),
  destination: varchar("destination", { length: 255 }),
  status: notificationDeliveryStatusEnum("status").notNull(),
  error: text("error"),
});

export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDelivery =
  typeof notificationDeliveries.$inferInsert;
