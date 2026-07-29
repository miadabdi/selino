import {
  AnyPgColumn,
  index,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { orders, orderStatusEnum } from "./orders.schema";
import { users } from "./users.schema";

export const orderStatusEvents = pgTable(
  "order_status_events",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    orderId: integer("order_id")
      .notNull()
      .references((): AnyPgColumn => orders.id, { onDelete: "cascade" }),
    previousStatus: orderStatusEnum("previous_status"),
    status: orderStatusEnum("status").notNull(),
    reason: text("reason"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    changedBy: integer("changed_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("order_status_events_order_created_idx").on(
      table.orderId,
      table.createdAt,
    ),
    index("order_status_events_status_idx").on(table.status),
  ],
);

export type OrderStatusEvent = typeof orderStatusEvents.$inferSelect;
export type NewOrderStatusEvent = typeof orderStatusEvents.$inferInsert;
