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
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { businessAddresses } from "./business-addresses.schema";
import { businessAccounts } from "./business-accounts.schema";
import { invoices } from "./invoices.schema";
import { purchaseRequests } from "./purchase-requests.schema";
import { users } from "./users.schema";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
]);

export const orders = pgTable(
  "orders",
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

    orderNumber: varchar("order_number", { length: 30 })
      .notNull()
      .default(
        sql`concat('ORD-', floor(random() * 900000000000 + 100000000000)::bigint::text)`,
      ),
    invoiceId: integer("invoice_id")
      .notNull()
      .references((): AnyPgColumn => invoices.id, {
        onDelete: "restrict",
      }),
    purchaseRequestId: integer("purchase_request_id").references(
      (): AnyPgColumn => purchaseRequests.id,
      { onDelete: "set null" },
    ),
    buyerBusinessAccountId: integer("buyer_business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "restrict",
      }),
    supplierBusinessAccountId: integer("supplier_business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "restrict",
      }),
    shippingAddressId: integer("shipping_address_id").references(
      (): AnyPgColumn => businessAddresses.id,
      { onDelete: "set null" },
    ),
    status: orderStatusEnum("status").notNull().default("pending"),
    totalAmount: numeric("total_amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("IRR"),
    notes: text("notes"),
    placedAt: timestamp("placed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdBy: integer("created_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    unique("orders_order_number_unique").on(table.orderNumber),
    unique("orders_invoice_unique").on(table.invoiceId),
    index("orders_buyer_status_created_idx").on(
      table.buyerBusinessAccountId,
      table.status,
      table.createdAt,
    ),
    index("orders_supplier_status_created_idx").on(
      table.supplierBusinessAccountId,
      table.status,
      table.createdAt,
    ),
    index("orders_purchase_request_idx").on(table.purchaseRequestId),
    check("orders_total_amount_check", sql`${table.totalAmount} >= 0`),
    check(
      "orders_distinct_accounts_check",
      sql`${table.buyerBusinessAccountId} <> ${table.supplierBusinessAccountId}`,
    ),
  ],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
