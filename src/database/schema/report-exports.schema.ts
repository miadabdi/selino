import {
  AnyPgColumn,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { businessAccounts } from "./business-accounts.schema";
import { files } from "./files.schema";
import { users } from "./users.schema";

export const reportExportTypeEnum = pgEnum("report_export_type", [
  "performance",
  "sales",
  "orders",
  "suppliers",
  "credit",
  "invoices",
]);

export const reportExportFormatEnum = pgEnum("report_export_format", [
  "pdf",
  "xlsx",
  "csv",
]);

export const reportExportStatusEnum = pgEnum("report_export_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "expired",
]);

export const reportExports = pgTable(
  "report_exports",
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

    businessAccountId: integer("business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "cascade",
      }),
    requestedBy: integer("requested_by")
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: "restrict" }),
    fileId: integer("file_id").references((): AnyPgColumn => files.id, {
      onDelete: "set null",
    }),
    type: reportExportTypeEnum("type").notNull(),
    format: reportExportFormatEnum("format").notNull(),
    status: reportExportStatusEnum("status").notNull().default("pending"),
    parameters: json("parameters")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("report_exports_business_created_idx").on(
      table.businessAccountId,
      table.createdAt,
    ),
    index("report_exports_requester_created_idx").on(
      table.requestedBy,
      table.createdAt,
    ),
    index("report_exports_status_idx").on(table.status),
  ],
);

export type ReportExport = typeof reportExports.$inferSelect;
export type NewReportExport = typeof reportExports.$inferInsert;
