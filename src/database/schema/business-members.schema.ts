import {
  AnyPgColumn,
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { businessAccounts } from "./business-accounts.schema";
import { roles } from "./roles.schema";
import { users } from "./users.schema";

export const businessMembers = pgTable(
  "business_members",
  {
    id: serial("id").primaryKey(),
    businessAccountId: integer("business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "cascade",
      }),
    userId: integer("user_id")
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references((): AnyPgColumn => roles.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("business_members_account_id_user_id_unique").on(
      table.businessAccountId,
      table.userId,
    ),
  ],
);

export type BusinessMember = typeof businessMembers.$inferSelect;
export type NewBusinessMember = typeof businessMembers.$inferInsert;
