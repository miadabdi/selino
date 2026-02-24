import {
  AnyPgColumn,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { stores } from "./stores.schema";
import { users } from "./users.schema";

export const purchaseRequestStatusEnum = pgEnum("purchase_request_status", [
  "new",
  "confirmed",
  "cancelled",
  "expired",
]);

export const purchaseRequests = pgTable("purchase_requests", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  expiresAt: timestamp("expires_at", { withTimezone: true }),

  requesterId: integer("requester_id")
    .notNull()
    .references((): AnyPgColumn => users.id),
  storeId: integer("store_id").references((): AnyPgColumn => stores.id, {
    onDelete: "set null",
  }),

  code: varchar("code", { length: 100 }),
  status: purchaseRequestStatusEnum("status").notNull().default("new"),

  totalAmount: numeric("total_amount", { mode: "number" }).notNull().default(0),
  notes: text("notes"),
});

export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type NewPurchaseRequest = typeof purchaseRequests.$inferInsert;
