import {
  AnyPgColumn,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { files } from "./files.schema";
import { supportTicketMessages } from "./support-ticket-messages.schema";
import { supportTickets } from "./support-tickets.schema";
import { users } from "./users.schema";

export const supportTicketAttachments = pgTable(
  "support_ticket_attachments",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    ticketId: integer("ticket_id")
      .notNull()
      .references((): AnyPgColumn => supportTickets.id, {
        onDelete: "cascade",
      }),
    messageId: integer("message_id").references(
      (): AnyPgColumn => supportTicketMessages.id,
      { onDelete: "cascade" },
    ),
    fileId: integer("file_id")
      .notNull()
      .references((): AnyPgColumn => files.id, { onDelete: "restrict" }),
    uploadedBy: integer("uploaded_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("support_ticket_attachments_ticket_idx").on(table.ticketId),
    index("support_ticket_attachments_message_idx").on(table.messageId),
    unique("support_ticket_attachments_file_unique").on(table.fileId),
  ],
);

export type SupportTicketAttachment =
  typeof supportTicketAttachments.$inferSelect;
export type NewSupportTicketAttachment =
  typeof supportTicketAttachments.$inferInsert;
