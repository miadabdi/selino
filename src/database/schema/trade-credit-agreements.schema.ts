import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  json,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { businessAccounts } from "./business-accounts.schema";
import { invoices } from "./invoices.schema";
import { purchaseRequests } from "./purchase-requests.schema";
import { users } from "./users.schema";

export const tradeCreditAgreementStatusEnum = pgEnum(
  "trade_credit_agreement_status",
  [
    "draft",
    "pending_signatures",
    "active",
    "suspended",
    "expired",
    "cancelled",
    "closed",
  ],
);

export const tradeCreditTransactionTypeEnum = pgEnum(
  "trade_credit_transaction_type",
  ["purchase", "return", "adjustment", "settlement"],
);

export const tradeCreditSettlementStatusEnum = pgEnum(
  "trade_credit_settlement_status",
  ["draft", "pending", "confirmed", "cancelled"],
);

export const tradeCreditSignaturePartyEnum = pgEnum(
  "trade_credit_signature_party",
  ["buyer", "supplier"],
);

export const tradeCreditAuditActionEnum = pgEnum("trade_credit_audit_action", [
  "created",
  "updated",
  "signed",
  "activated",
  "suspended",
  "cancelled",
  "closed",
  "transaction_created",
  "settlement_created",
  "settlement_confirmed",
  "over_limit_requested",
  "over_limit_approved",
  "over_limit_rejected",
]);

export const tradeCreditApprovalStatusEnum = pgEnum(
  "trade_credit_approval_status",
  ["pending", "approved", "rejected", "cancelled"],
);

export const tradeCreditAgreements = pgTable(
  "trade_credit_agreements",
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

    label: varchar("label", { length: 255 }),
    description: text("description"),

    creditLimit: numeric("credit_limit", { mode: "number" })
      .notNull()
      .default(0),
    usedCredit: numeric("used_credit", { mode: "number" }).notNull().default(0),
    currency: varchar("currency", { length: 10 }).notNull().default("IRR"),

    settlementCycle: varchar("settlement_cycle", { length: 50 })
      .notNull()
      .default("monthly"),
    settlementDayOfMonth: integer("settlement_day_of_month"),

    requiresBuyerSignature: boolean("requires_buyer_signature")
      .notNull()
      .default(true),
    requiresSupplierSignature: boolean("requires_supplier_signature")
      .notNull()
      .default(true),
    buyerSignedAt: timestamp("buyer_signed_at", { withTimezone: true }),
    supplierSignedAt: timestamp("supplier_signed_at", { withTimezone: true }),

    status: tradeCreditAgreementStatusEnum("status").notNull().default("draft"),
    isActive: boolean("is_active").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspensionReason: text("suspension_reason"),

    createdBy: integer("created_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("trade_credit_agreements_buyer_idx").on(table.buyerBusinessAccountId),
    index("trade_credit_agreements_supplier_idx").on(
      table.supplierBusinessAccountId,
    ),
    index("trade_credit_agreements_pair_idx").on(
      table.buyerBusinessAccountId,
      table.supplierBusinessAccountId,
    ),
    index("trade_credit_agreements_status_idx").on(table.status),
    check(
      "trade_credit_agreements_distinct_accounts_check",
      sql`${table.buyerBusinessAccountId} <> ${table.supplierBusinessAccountId}`,
    ),
    check(
      "trade_credit_agreements_credit_limit_check",
      sql`${table.creditLimit} >= 0`,
    ),
    check(
      "trade_credit_agreements_used_credit_check",
      sql`${table.usedCredit} >= 0`,
    ),
    check(
      "trade_credit_agreements_settlement_day_check",
      sql`${table.settlementDayOfMonth} is null or (${table.settlementDayOfMonth} >= 1 and ${table.settlementDayOfMonth} <= 31)`,
    ),
  ],
);

export const tradeCreditApprovalRequests = pgTable(
  "trade_credit_approval_requests",
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

    agreementId: integer("agreement_id")
      .notNull()
      .references((): AnyPgColumn => tradeCreditAgreements.id, {
        onDelete: "restrict",
      }),
    purchaseRequestId: integer("purchase_request_id")
      .notNull()
      .references((): AnyPgColumn => purchaseRequests.id, {
        onDelete: "restrict",
      }),
    invoiceId: integer("invoice_id").references(
      (): AnyPgColumn => invoices.id,
      {
        onDelete: "set null",
      },
    ),
    requestedBy: integer("requested_by")
      .notNull()
      .references((): AnyPgColumn => users.id, {
        onDelete: "restrict",
      }),
    ownerBusinessAccountId: integer("owner_business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "restrict",
      }),

    requestedAmount: numeric("requested_amount", { mode: "number" }).notNull(),
    debtLimit: numeric("debt_limit", { mode: "number" }).notNull(),
    currentDebt: numeric("current_debt", { mode: "number" }).notNull(),
    projectedDebt: numeric("projected_debt", { mode: "number" }).notNull(),
    overLimitAmount: numeric("over_limit_amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("IRR"),

    status: tradeCreditApprovalStatusEnum("status")
      .notNull()
      .default("pending"),
    approvedBy: integer("approved_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedBy: integer("rejected_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    note: text("note"),
  },
  (table) => [
    index("trade_credit_approval_requests_agreement_idx").on(table.agreementId),
    index("trade_credit_approval_requests_purchase_request_idx").on(
      table.purchaseRequestId,
    ),
    index("trade_credit_approval_requests_owner_status_idx").on(
      table.ownerBusinessAccountId,
      table.status,
    ),
    check(
      "trade_credit_approval_requests_amount_check",
      sql`${table.requestedAmount} > 0 and ${table.overLimitAmount} > 0`,
    ),
    check(
      "trade_credit_approval_requests_debt_check",
      sql`${table.projectedDebt} > ${table.debtLimit}`,
    ),
  ],
);

export const tradeCreditTransactions = pgTable(
  "trade_credit_transactions",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    agreementId: integer("agreement_id")
      .notNull()
      .references((): AnyPgColumn => tradeCreditAgreements.id, {
        onDelete: "restrict",
      }),
    type: tradeCreditTransactionTypeEnum("type").notNull(),
    amount: numeric("amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("IRR"),
    referenceType: varchar("reference_type", { length: 100 }),
    referenceId: integer("reference_id"),
    description: text("description"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: integer("created_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("trade_credit_transactions_agreement_idx").on(table.agreementId),
    index("trade_credit_transactions_occurred_at_idx").on(table.occurredAt),
    check("trade_credit_transactions_amount_check", sql`${table.amount} <> 0`),
  ],
);

export const tradeCreditSettlements = pgTable(
  "trade_credit_settlements",
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

    agreementId: integer("agreement_id")
      .notNull()
      .references((): AnyPgColumn => tradeCreditAgreements.id, {
        onDelete: "restrict",
      }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    openingBalance: numeric("opening_balance", { mode: "number" })
      .notNull()
      .default(0),
    totalPurchases: numeric("total_purchases", { mode: "number" })
      .notNull()
      .default(0),
    totalReturns: numeric("total_returns", { mode: "number" })
      .notNull()
      .default(0),
    totalAdjustments: numeric("total_adjustments", { mode: "number" })
      .notNull()
      .default(0),
    netAmount: numeric("net_amount", { mode: "number" }).notNull().default(0),
    closingBalance: numeric("closing_balance", { mode: "number" })
      .notNull()
      .default(0),
    currency: varchar("currency", { length: 10 }).notNull().default("IRR"),
    status: tradeCreditSettlementStatusEnum("status")
      .notNull()
      .default("draft"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    confirmedBy: integer("confirmed_by").references(
      (): AnyPgColumn => users.id,
      {
        onDelete: "set null",
      },
    ),
  },
  (table) => [
    index("trade_credit_settlements_agreement_idx").on(table.agreementId),
    unique("trade_credit_settlements_period_unique").on(
      table.agreementId,
      table.periodStart,
      table.periodEnd,
    ),
    check(
      "trade_credit_settlements_period_check",
      sql`${table.periodEnd} > ${table.periodStart}`,
    ),
  ],
);

export const tradeCreditAgreementSignatures = pgTable(
  "trade_credit_agreement_signatures",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    agreementId: integer("agreement_id")
      .notNull()
      .references((): AnyPgColumn => tradeCreditAgreements.id, {
        onDelete: "restrict",
      }),
    party: tradeCreditSignaturePartyEnum("party").notNull(),
    businessAccountId: integer("business_account_id")
      .notNull()
      .references((): AnyPgColumn => businessAccounts.id, {
        onDelete: "restrict",
      }),
    signedBy: integer("signed_by")
      .notNull()
      .references((): AnyPgColumn => users.id, {
        onDelete: "restrict",
      }),
    signedAt: timestamp("signed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    signaturePayload:
      json("signature_payload").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 100 }),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("trade_credit_signatures_agreement_idx").on(table.agreementId),
    unique("trade_credit_signatures_party_unique").on(
      table.agreementId,
      table.party,
    ),
  ],
);

export const tradeCreditAuditLogs = pgTable(
  "trade_credit_audit_logs",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    agreementId: integer("agreement_id")
      .notNull()
      .references((): AnyPgColumn => tradeCreditAgreements.id, {
        onDelete: "restrict",
      }),
    action: tradeCreditAuditActionEnum("action").notNull(),
    actorUserId: integer("actor_user_id").references(
      (): AnyPgColumn => users.id,
      {
        onDelete: "set null",
      },
    ),
    actorBusinessAccountId: integer("actor_business_account_id").references(
      (): AnyPgColumn => businessAccounts.id,
      { onDelete: "set null" },
    ),
    before: json("before").$type<Record<string, unknown>>(),
    after: json("after").$type<Record<string, unknown>>(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("trade_credit_audit_logs_agreement_idx").on(table.agreementId),
    index("trade_credit_audit_logs_action_idx").on(table.action),
  ],
);

export type TradeCreditAgreement = typeof tradeCreditAgreements.$inferSelect;
export type NewTradeCreditAgreement = typeof tradeCreditAgreements.$inferInsert;
export type TradeCreditApprovalRequest =
  typeof tradeCreditApprovalRequests.$inferSelect;
export type NewTradeCreditApprovalRequest =
  typeof tradeCreditApprovalRequests.$inferInsert;
export type TradeCreditTransaction =
  typeof tradeCreditTransactions.$inferSelect;
export type NewTradeCreditTransaction =
  typeof tradeCreditTransactions.$inferInsert;
export type TradeCreditSettlement = typeof tradeCreditSettlements.$inferSelect;
export type NewTradeCreditSettlement =
  typeof tradeCreditSettlements.$inferInsert;
export type TradeCreditAgreementSignature =
  typeof tradeCreditAgreementSignatures.$inferSelect;
export type NewTradeCreditAgreementSignature =
  typeof tradeCreditAgreementSignatures.$inferInsert;
export type TradeCreditAuditLog = typeof tradeCreditAuditLogs.$inferSelect;
export type NewTradeCreditAuditLog = typeof tradeCreditAuditLogs.$inferInsert;
