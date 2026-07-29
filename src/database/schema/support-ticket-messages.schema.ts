import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { supportTickets } from "./support-tickets.schema";
import { users } from "./users.schema";

export const supportTicketMessages = pgTable(
  "support_ticket_messages",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),

    ticketId: integer("ticket_id")
      .notNull()
      .references((): AnyPgColumn => supportTickets.id, {
        onDelete: "cascade",
      }),
    authorId: integer("author_id").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    isInternal: boolean("is_internal").notNull().default(false),
  },
  (table) => [
    index("support_ticket_messages_ticket_created_idx").on(
      table.ticketId,
      table.createdAt,
    ),
    index("support_ticket_messages_author_idx").on(table.authorId),
  ],
);

export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type NewSupportTicketMessage = typeof supportTicketMessages.$inferInsert;
