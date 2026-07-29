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
import { invoices, invoiceStatusEnum } from "./invoices.schema";
import { users } from "./users.schema";

export const invoiceStatusEvents = pgTable(
  "invoice_status_events",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    invoiceId: integer("invoice_id")
      .notNull()
      .references((): AnyPgColumn => invoices.id, { onDelete: "cascade" }),
    previousStatus: invoiceStatusEnum("previous_status"),
    status: invoiceStatusEnum("status").notNull(),
    reason: text("reason"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    changedBy: integer("changed_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("invoice_status_events_invoice_created_idx").on(
      table.invoiceId,
      table.createdAt,
    ),
    index("invoice_status_events_status_idx").on(table.status),
  ],
);

export type InvoiceStatusEvent = typeof invoiceStatusEvents.$inferSelect;
export type NewInvoiceStatusEvent = typeof invoiceStatusEvents.$inferInsert;
