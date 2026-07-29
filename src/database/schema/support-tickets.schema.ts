import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { businessAccounts } from "./business-accounts.schema";
import { users } from "./users.schema";

export const supportTicketCategoryEnum = pgEnum("support_ticket_category", [
  "account",
  "catalog",
  "credit",
  "invoice",
  "order",
  "payment",
  "shipment",
  "technical",
  "other",
]);

export const supportTicketPriorityEnum = pgEnum("support_ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const supportTicketStatusEnum = pgEnum("support_ticket_status", [
  "open",
  "in_progress",
  "waiting_for_customer",
  "resolved",
  "closed",
]);

export const supportTickets = pgTable(
  "support_tickets",
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

    ticketNumber: varchar("ticket_number", { length: 30 })
      .notNull()
      .default(
        sql`concat('SUP-', floor(random() * 900000000000 + 100000000000)::bigint::text)`,
      ),
    businessAccountId: integer("business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "restrict",
      }),
    requesterId: integer("requester_id")
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: "restrict" }),
    assignedTo: integer("assigned_to").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    subject: varchar("subject", { length: 255 }).notNull(),
    description: text("description").notNull(),
    category: supportTicketCategoryEnum("category").notNull().default("other"),
    priority: supportTicketPriorityEnum("priority").notNull().default("normal"),
    status: supportTicketStatusEnum("status").notNull().default("open"),
    relatedEntityType: varchar("related_entity_type", { length: 100 }),
    relatedEntityId: integer("related_entity_id"),
    resolution: text("resolution"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    unique("support_tickets_ticket_number_unique").on(table.ticketNumber),
    index("support_tickets_business_status_updated_idx").on(
      table.businessAccountId,
      table.status,
      table.updatedAt,
    ),
    index("support_tickets_requester_status_idx").on(
      table.requesterId,
      table.status,
    ),
    index("support_tickets_assignee_status_idx").on(
      table.assignedTo,
      table.status,
    ),
    index("support_tickets_related_entity_idx").on(
      table.relatedEntityType,
      table.relatedEntityId,
    ),
  ],
);

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
