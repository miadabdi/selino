import {
  AnyPgColumn,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { purchaseRequests } from "./purchase-requests.schema";
import { businessAccounts } from "./business-accounts.schema";
import { users } from "./users.schema";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "pending_credit_approval",
  "pending",
  "sent",
  "delivered",
  "paid",
  "rejected",
  "expired",
]);

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),

    supplierBusinessAccountId: integer("supplier_business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id),
    buyerBusinessAccountId: integer("buyer_business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id),
    buyerId: integer("buyer_id")
      .notNull()
      .references((): AnyPgColumn => users.id),

    purchaseRequestId: integer("purchase_request_id").references(
      (): AnyPgColumn => purchaseRequests.id,
      { onDelete: "set null" },
    ),

    invoiceNumber: varchar("invoice_number", { length: 10 })
      .notNull()
      .default(sql`(floor(random() * 9000000000)::bigint + 1000000000)::text`)
      .unique(),
    status: invoiceStatusEnum("status").notNull().default("pending"),

    totalAmount: numeric("total_amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("IRR"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    meta: text("meta"),
  },
  (table) => [
    unique("invoices_purchase_request_supplier_unique").on(
      table.purchaseRequestId,
      table.supplierBusinessAccountId,
    ),
  ],
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
