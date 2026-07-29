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
import { businessAccounts } from "./business-accounts.schema";
import { businessWallets } from "./business-wallets.schema";
import { invoices } from "./invoices.schema";
import { users } from "./users.schema";

export const paymentMethodEnum = pgEnum("payment_method", [
  "wallet",
  "credit",
  "bank_transfer",
  "gateway",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "partially_refunded",
  "refunded",
]);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),

    businessAccountId: integer("business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "restrict",
      }),
    invoiceId: integer("invoice_id")
      .notNull()
      .references((): AnyPgColumn => invoices.id, {
        onDelete: "restrict",
      }),
    walletId: integer("wallet_id").references(
      (): AnyPgColumn => businessWallets.id,
      { onDelete: "restrict" },
    ),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amount: numeric("amount", { mode: "number" }).notNull(),
    refundedAmount: numeric("refunded_amount", { mode: "number" })
      .notNull()
      .default(0),
    currency: varchar("currency", { length: 10 }).notNull().default("IRR"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 100 }),
    providerReference: varchar("provider_reference", { length: 255 }),
    failureCode: varchar("failure_code", { length: 100 }),
    failureMessage: text("failure_message"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdBy: integer("created_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("payments_business_created_at_idx").on(
      table.businessAccountId,
      table.createdAt,
    ),
    index("payments_invoice_idx").on(table.invoiceId),
    index("payments_status_idx").on(table.status),
    uniqueIndex("payments_idempotency_key_unique").on(table.idempotencyKey),
    uniqueIndex("payments_provider_reference_unique")
      .on(table.provider, table.providerReference)
      .where(sql`${table.providerReference} is not null`),
    check("payments_amount_check", sql`${table.amount} > 0`),
    check(
      "payments_refunded_amount_check",
      sql`${table.refundedAmount} >= 0 and ${table.refundedAmount} <= ${table.amount}`,
    ),
    check(
      "payments_wallet_method_check",
      sql`${table.method} <> 'wallet' or ${table.walletId} is not null`,
    ),
  ],
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
