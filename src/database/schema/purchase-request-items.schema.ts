import {
  AnyPgColumn,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { products } from "./products.schema";
import { purchaseRequests } from "./purchase-requests.schema";
import { storeInventories } from "./store-inventories.schema";

export const purchaseRequestItems = pgTable("purchase_request_items", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  purchaseRequestId: integer("purchase_request_id")
    .notNull()
    .references((): AnyPgColumn => purchaseRequests.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references((): AnyPgColumn => products.id),
  storeInventoryId: integer("store_inventory_id").references(
    (): AnyPgColumn => storeInventories.id,
    { onDelete: "set null" },
  ),

  qty: integer("qty").notNull().default(1),
  price: numeric("price", { mode: "number" }).notNull(),
  total: numeric("total", { mode: "number" }).notNull(),
});

export type PurchaseRequestItem = typeof purchaseRequestItems.$inferSelect;
export type NewPurchaseRequestItem = typeof purchaseRequestItems.$inferInsert;
