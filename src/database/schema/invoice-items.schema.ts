import {
  AnyPgColumn,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { invoices } from "./invoices.schema";
import { products } from "./products.schema";
import { storeInventories } from "./store-inventories.schema";

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  invoiceId: integer("invoice_id")
    .notNull()
    .references((): AnyPgColumn => invoices.id, { onDelete: "cascade" }),
  productId: integer("product_id").references((): AnyPgColumn => products.id, {
    onDelete: "set null",
  }),
  storeInventoryId: integer("store_inventory_id").references(
    (): AnyPgColumn => storeInventories.id,
    { onDelete: "set null" },
  ),

  description: text("description"),
  qty: integer("qty").notNull().default(1),
  unitPrice: numeric("unit_price", { mode: "number" }).notNull(),
  total: numeric("total", { mode: "number" }).notNull(),
});

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
