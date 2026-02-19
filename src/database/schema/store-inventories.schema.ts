import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { products } from "./products.schema";
import { stores } from "./stores.schema";
import { users } from "./users.schema";

export const storeInventories = pgTable(
  "store_inventories",
  {
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
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),

    price: numeric("price", { mode: "number" }).notNull(),
    stock: integer("stock").notNull().default(0),
    reservedStock: integer("reserved_stock").notNull().default(0),
    minOrderQty: integer("min_order_qty").notNull().default(1),
    maxOrderQty: integer("max_order_qty"),
    isActive: boolean("is_active").notNull().default(true),
    visible: boolean("visible").notNull().default(true),
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    unique("store_inventories_store_id_product_id_unique").on(
      table.storeId,
      table.productId,
    ),
  ],
);

export type StoreInventory = typeof storeInventories.$inferSelect;
export type NewStoreInventory = typeof storeInventories.$inferInsert;
