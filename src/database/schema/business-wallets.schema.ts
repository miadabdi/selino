import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { businessAccounts } from "./business-accounts.schema";

export const businessWalletStatusEnum = pgEnum("business_wallet_status", [
  "active",
  "frozen",
  "closed",
]);

export const businessWallets = pgTable(
  "business_wallets",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    businessAccountId: integer("business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "restrict",
      }),
    currency: varchar("currency", { length: 10 }).notNull().default("IRR"),
    balance: numeric("balance", { mode: "number" }).notNull().default(0),
    reservedBalance: numeric("reserved_balance", { mode: "number" })
      .notNull()
      .default(0),
    availableBalance: numeric("available_balance", {
      mode: "number",
    }).generatedAlwaysAs(sql`balance - reserved_balance`),
    status: businessWalletStatusEnum("status").notNull().default("active"),
    frozenAt: timestamp("frozen_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    index("business_wallets_account_idx").on(table.businessAccountId),
    uniqueIndex("business_wallets_active_account_currency_unique")
      .on(table.businessAccountId, table.currency)
      .where(sql`${table.deletedAt} is null`),
    check("business_wallets_balance_check", sql`${table.balance} >= 0`),
    check(
      "business_wallets_reserved_balance_check",
      sql`${table.reservedBalance} >= 0 and ${table.reservedBalance} <= ${table.balance}`,
    ),
  ],
);

export type BusinessWallet = typeof businessWallets.$inferSelect;
export type NewBusinessWallet = typeof businessWallets.$inferInsert;
