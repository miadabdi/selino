import {
  AnyPgColumn,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { purchaseRequests } from "./purchase-requests.schema";
import { stores } from "./stores.schema";
import { users } from "./users.schema";

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),

  storeId: integer("store_id")
    .notNull()
    .references((): AnyPgColumn => stores.id),
  buyerId: integer("buyer_id")
    .notNull()
    .references((): AnyPgColumn => users.id),

  purchaseRequestId: integer("purchase_request_id").references(
    (): AnyPgColumn => purchaseRequests.id,
    { onDelete: "set null" },
  ),

  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),

  totalAmount: numeric("total_amount", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("IRR"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  meta: text("meta"),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
