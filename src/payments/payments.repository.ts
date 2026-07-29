import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  invoiceStatusEvents,
  invoices,
  payments,
} from "../database/schema/index";

export type CreatePaymentRecord = {
  businessAccountId: number;
  invoiceId: number;
  walletId: number | null;
  amount: number;
  currency: string;
  method: "wallet" | "gateway";
  provider: string;
  idempotencyKey: string;
  createdBy: number;
};

@Injectable()
export class PaymentsRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  findInvoiceForBuyer(
    businessAccountId: number,
    invoiceId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.invoices.findFirst({
      where: (table) =>
        and(
          eq(table.id, invoiceId),
          eq(table.buyerBusinessAccountId, businessAccountId),
        ),
    });
  }

  async findInvoiceForBuyerForUpdate(
    businessAccountId: number,
    invoiceId: number,
    txContext: TXContext,
  ) {
    const [invoice] = await txContext
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.buyerBusinessAccountId, businessAccountId),
        ),
      )
      .for("update");
    return invoice;
  }

  findByIdempotencyKey(
    businessAccountId: number,
    idempotencyKey: string,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.payments.findFirst({
      where: (table) =>
        and(
          eq(table.businessAccountId, businessAccountId),
          eq(table.idempotencyKey, idempotencyKey),
        ),
    });
  }

  findForBusiness(
    businessAccountId: number,
    paymentId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.payments.findFirst({
      where: (table) =>
        and(
          eq(table.id, paymentId),
          eq(table.businessAccountId, businessAccountId),
        ),
    });
  }

  async findForBusinessForUpdate(
    businessAccountId: number,
    paymentId: number,
    txContext: TXContext,
  ) {
    const [payment] = await txContext
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.businessAccountId, businessAccountId),
        ),
      )
      .for("update");
    return payment;
  }

  async create(record: CreatePaymentRecord, txContext: TXContext = this.db) {
    const [payment] = await txContext
      .insert(payments)
      .values({ ...record, status: "pending", refundedAmount: 0 })
      .returning();
    return payment;
  }

  async markCompleted(
    paymentId: number,
    providerReference: string | null,
    txContext: TXContext,
  ) {
    const [payment] = await txContext
      .update(payments)
      .set({
        status: "succeeded",
        providerReference,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")))
      .returning();
    return payment;
  }

  async addRefund(
    paymentId: number,
    amount: number,
    fullyRefunded: boolean,
    metadata: Record<string, unknown>,
    txContext: TXContext,
  ) {
    const [payment] = await txContext
      .update(payments)
      .set({
        refundedAmount: sql`${payments.refundedAmount} + ${amount}`,
        status: fullyRefunded ? "refunded" : "partially_refunded",
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();
    return payment;
  }

  async markInvoicePaid(
    invoiceId: number,
    previousStatus:
      | "pending_credit_approval"
      | "pending"
      | "sent"
      | "delivered"
      | "paid"
      | "rejected"
      | "expired"
      | "cancelled",
    actorId: number,
    txContext: TXContext,
  ) {
    const [invoice] = await txContext
      .update(invoices)
      .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, invoiceId),
          sql`${invoices.status} not in ('paid', 'rejected', 'expired')`,
        ),
      )
      .returning();
    if (invoice) {
      await txContext.insert(invoiceStatusEvents).values({
        invoiceId,
        previousStatus,
        status: "paid",
        changedBy: actorId,
        reason: "Payment completed",
      });
    }
    return invoice;
  }
}
