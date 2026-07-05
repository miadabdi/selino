import {
  AnyPgColumn,
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { businessAccounts } from "./business-accounts.schema";
import { packages } from "./packages.schema";

export const businessSubscriptions = pgTable("business_subscriptions", {
  id: serial("id").primaryKey(),
  businessAccountId: integer("business_account_id")
    .notNull()
    .references((): AnyPgColumn => businessAccounts.id, {
      onDelete: "cascade",
    }),
  packageId: integer("package_id")
    .notNull()
    .references((): AnyPgColumn => packages.id, { onDelete: "restrict" }),
  startsAt: timestamp("starts_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BusinessSubscription = typeof businessSubscriptions.$inferSelect;
export type NewBusinessSubscription = typeof businessSubscriptions.$inferInsert;
