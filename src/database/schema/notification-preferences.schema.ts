import {
  AnyPgColumn,
  boolean,
  integer,
  json,
  pgTable,
  serial,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { businessAccounts } from "./business-accounts.schema";
import { users } from "./users.schema";

export interface NotificationCategoryPreferences {
  credit?: boolean;
  invoices?: boolean;
  orders?: boolean;
  payments?: boolean;
  purchaseRequests?: boolean;
  shipments?: boolean;
  support?: boolean;
}

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),

    userId: integer("user_id")
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
    businessAccountId: integer("business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "cascade",
      }),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    smsEnabled: boolean("sms_enabled").notNull().default(true),
    pushEnabled: boolean("push_enabled").notNull().default(false),
    categories: json("categories")
      .$type<NotificationCategoryPreferences>()
      .notNull()
      .default({}),
  },
  (table) => [
    unique("notification_preferences_user_business_unique").on(
      table.userId,
      table.businessAccountId,
    ),
  ],
);

export type NotificationPreference =
  typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference =
  typeof notificationPreferences.$inferInsert;
