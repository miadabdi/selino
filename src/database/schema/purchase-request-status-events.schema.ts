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
import {
  purchaseRequests,
  purchaseRequestStatusEnum,
} from "./purchase-requests.schema";
import { users } from "./users.schema";

export const purchaseRequestStatusEvents = pgTable(
  "purchase_request_status_events",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    purchaseRequestId: integer("purchase_request_id")
      .notNull()
      .references((): AnyPgColumn => purchaseRequests.id, {
        onDelete: "cascade",
      }),
    previousStatus: purchaseRequestStatusEnum("previous_status"),
    status: purchaseRequestStatusEnum("status").notNull(),
    reason: text("reason"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    changedBy: integer("changed_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("purchase_request_status_events_request_created_idx").on(
      table.purchaseRequestId,
      table.createdAt,
    ),
    index("purchase_request_status_events_status_idx").on(table.status),
  ],
);

export type PurchaseRequestStatusEvent =
  typeof purchaseRequestStatusEvents.$inferSelect;
export type NewPurchaseRequestStatusEvent =
  typeof purchaseRequestStatusEvents.$inferInsert;
