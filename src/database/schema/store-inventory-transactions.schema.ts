import {
  AnyPgColumn,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { storeInventories } from "./store-inventories.schema";
import { users } from "./users.schema";

export const storeInventoryTransactionReasonEnum = pgEnum(
  "store_inventory_transaction_reason",
  ["restock", "sale", "cancellation", "adjustment", "reservation_expired"],
);

export const storeInventoryTransactions = pgTable(
  "store_inventory_transactions",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    storeInventoryId: integer("store_inventory_id")
      .notNull()
      .references((): AnyPgColumn => storeInventories.id, {
        onDelete: "cascade",
      }),
    change: integer("change").notNull(),
    reason: storeInventoryTransactionReasonEnum("reason"),
    reference: varchar("reference", { length: 255 }),
    changedBy: integer("changed_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
);

export type StoreInventoryTransaction =
  typeof storeInventoryTransactions.$inferSelect;
export type NewStoreInventoryTransaction =
  typeof storeInventoryTransactions.$inferInsert;
