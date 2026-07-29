import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { businessAccounts } from "./business-accounts.schema";
import { users } from "./users.schema";

export const businessSupplierLinkStatusEnum = pgEnum(
  "business_supplier_link_status",
  ["pending", "active", "suspended", "rejected", "terminated"],
);

export const businessSupplierLinks = pgTable(
  "business_supplier_links",
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

    buyerBusinessAccountId: integer("buyer_business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "restrict",
      }),
    supplierBusinessAccountId: integer("supplier_business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "restrict",
      }),
    status: businessSupplierLinkStatusEnum("status")
      .notNull()
      .default("pending"),
    displayName: varchar("display_name", { length: 255 }),
    contactName: varchar("contact_name", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 30 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    notes: text("notes"),
    requestedBy: integer("requested_by").references(
      (): AnyPgColumn => users.id,
      { onDelete: "set null" },
    ),
    approvedBy: integer("approved_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspensionReason: text("suspension_reason"),
  },
  (table) => [
    index("business_supplier_links_buyer_status_idx").on(
      table.buyerBusinessAccountId,
      table.status,
    ),
    index("business_supplier_links_supplier_status_idx").on(
      table.supplierBusinessAccountId,
      table.status,
    ),
    uniqueIndex("business_supplier_links_active_pair_unique")
      .on(table.buyerBusinessAccountId, table.supplierBusinessAccountId)
      .where(sql`${table.deletedAt} is null`),
    check(
      "business_supplier_links_distinct_accounts_check",
      sql`${table.buyerBusinessAccountId} <> ${table.supplierBusinessAccountId}`,
    ),
  ],
);

export type BusinessSupplierLink = typeof businessSupplierLinks.$inferSelect;
export type NewBusinessSupplierLink = typeof businessSupplierLinks.$inferInsert;
