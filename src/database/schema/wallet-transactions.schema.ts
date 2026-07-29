import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  check,
  index,
  integer,
  json,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { businessWallets } from "./business-wallets.schema";
import { invoices } from "./invoices.schema";
import { users } from "./users.schema";

export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", [
  "deposit",
  "withdrawal",
  "payment",
  "refund",
  "adjustment",
  "reservation",
  "release",
]);

export const walletTransactionDirectionEnum = pgEnum(
  "wallet_transaction_direction",
  ["credit", "debit"],
);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    walletId: integer("wallet_id")
      .notNull()
      .references((): AnyPgColumn => businessWallets.id, {
        onDelete: "restrict",
      }),
    invoiceId: integer("invoice_id").references(
      (): AnyPgColumn => invoices.id,
      { onDelete: "set null" },
    ),
    type: walletTransactionTypeEnum("type").notNull(),
    direction: walletTransactionDirectionEnum("direction").notNull(),
    amount: numeric("amount", { mode: "number" }).notNull(),
    balanceBefore: numeric("balance_before", { mode: "number" }).notNull(),
    balanceAfter: numeric("balance_after", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("IRR"),
    referenceType: varchar("reference_type", { length: 100 }),
    referenceId: varchar("reference_id", { length: 255 }),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    description: text("description"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdBy: integer("created_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("wallet_transactions_wallet_occurred_at_idx").on(
      table.walletId,
      table.occurredAt,
    ),
    index("wallet_transactions_invoice_idx").on(table.invoiceId),
    index("wallet_transactions_reference_idx").on(
      table.referenceType,
      table.referenceId,
    ),
    uniqueIndex("wallet_transactions_idempotency_key_unique")
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    check("wallet_transactions_amount_check", sql`${table.amount} > 0`),
    check(
      "wallet_transactions_balance_check",
      sql`${table.balanceBefore} >= 0 and ${table.balanceAfter} >= 0`,
    ),
  ],
);

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type NewWalletTransaction = typeof walletTransactions.$inferInsert;
