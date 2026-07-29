import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  invoiceStatusEvents,
  invoices,
  orders,
  orderStatusEvents,
} from "../database/schema/index";
import type { ListOrdersQueryDto } from "./dto/list-orders-query.dto";

type OrderStatus = ListOrdersQueryDto["status"];

@Injectable()
export class OrdersRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  findInvoiceForDerivation(invoiceId: number, txContext: TXContext = this.db) {
    return txContext.query.invoices.findFirst({
      where: (table) => eq(table.id, invoiceId),
      with: { purchaseRequest: true },
    });
  }

  findByInvoiceId(invoiceId: number, txContext: TXContext = this.db) {
    return txContext.query.orders.findFirst({
      where: (table) => eq(table.invoiceId, invoiceId),
    });
  }

  async createFromInvoice(
    invoice: {
      id: number;
      buyerBusinessAccountId: number;
      supplierBusinessAccountId: number;
      totalAmount: number;
      currency: string;
      purchaseRequestId: number | null;
    },
    actorId: number,
    txContext: TXContext = this.db,
  ) {
    const [order] = await txContext
      .insert(orders)
      .values({
        invoiceId: invoice.id,
        purchaseRequestId: invoice.purchaseRequestId,
        buyerBusinessAccountId: invoice.buyerBusinessAccountId,
        supplierBusinessAccountId: invoice.supplierBusinessAccountId,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        status: "confirmed",
        createdBy: actorId,
      })
      .onConflictDoNothing({ target: orders.invoiceId })
      .returning();
    if (!order) return this.findByInvoiceId(invoice.id, txContext);

    await txContext.insert(orderStatusEvents).values({
      orderId: order.id,
      previousStatus: null,
      status: "confirmed",
      changedBy: actorId,
      reason: "Order derived from confirmed invoice",
    });
    return order;
  }

  findEligibleInvoicesForBusiness(
    businessAccountId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.invoices.findMany({
      where: (table) =>
        and(
          or(
            eq(table.buyerBusinessAccountId, businessAccountId),
            eq(table.supplierBusinessAccountId, businessAccountId),
          ),
          inArray(table.status, ["pending", "sent", "delivered", "paid"]),
        ),
      with: {
        purchaseRequest: true,
        order: true,
      },
    });
  }

  async listForBusiness(
    businessAccountId: number,
    query: ListOrdersQueryDto,
    txContext: TXContext = this.db,
  ) {
    const conditions = [
      or(
        eq(orders.buyerBusinessAccountId, businessAccountId),
        eq(orders.supplierBusinessAccountId, businessAccountId),
      ),
    ];
    if (query.status) conditions.push(eq(orders.status, query.status));
    if (query.search) {
      conditions.push(
        or(
          ilike(orders.orderNumber, `%${query.search}%`),
          sql`exists (
            select 1 from ${invoices}
            where ${invoices.id} = ${orders.invoiceId}
              and ${invoices.invoiceNumber} ilike ${`%${query.search}%`}
          )`,
        ),
      );
    }
    if (query.createdFrom) {
      conditions.push(gte(orders.createdAt, new Date(query.createdFrom)));
    }
    if (query.createdTo) {
      conditions.push(lte(orders.createdAt, new Date(query.createdTo)));
    }
    const where = and(...conditions);
    const offset = (query.page - 1) * query.limit;
    const [items, countRows] = await Promise.all([
      txContext.query.orders.findMany({
        where,
        orderBy: (table) => [desc(table.createdAt), desc(table.id)],
        limit: query.limit,
        offset,
      }),
      txContext
        .select({ total: sql<number>`count(*)::int` })
        .from(orders)
        .where(where),
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total: countRows[0]?.total ?? 0,
    };
  }

  async findForBusiness(
    businessAccountId: number,
    orderId: number,
    txContext: TXContext = this.db,
  ) {
    const order = await txContext.query.orders.findFirst({
      where: (table) =>
        and(
          eq(table.id, orderId),
          or(
            eq(table.buyerBusinessAccountId, businessAccountId),
            eq(table.supplierBusinessAccountId, businessAccountId),
          ),
        ),
    });
    if (!order) return undefined;
    const events = await txContext.query.orderStatusEvents.findMany({
      where: (table) => eq(table.orderId, order.id),
      orderBy: (table) => [desc(table.createdAt), desc(table.id)],
    });
    return { ...order, events };
  }

  async findForBusinessForUpdate(
    businessAccountId: number,
    orderId: number,
    txContext: TXContext,
  ) {
    const [order] = await txContext
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          or(
            eq(orders.buyerBusinessAccountId, businessAccountId),
            eq(orders.supplierBusinessAccountId, businessAccountId),
          ),
        ),
      )
      .for("update");
    return order;
  }

  async updateStatus(
    orderId: number,
    fromStatus: Exclude<OrderStatus, undefined>,
    toStatus: Exclude<OrderStatus, undefined>,
    actorId: number,
    note: string | undefined,
    txContext: TXContext,
    synchronizeInvoice = true,
  ) {
    const [order] = await txContext
      .update(orders)
      .set({
        status: toStatus,
        completedAt: toStatus === "delivered" ? new Date() : undefined,
        cancelledAt: toStatus === "cancelled" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, fromStatus)))
      .returning();
    if (order) {
      await txContext.insert(orderStatusEvents).values({
        orderId,
        previousStatus: fromStatus,
        status: toStatus,
        changedBy: actorId,
        reason: note,
      });
      if (synchronizeInvoice) {
        const invoiceSynchronized = await this.synchronizeInvoiceForOrder(
          order.invoiceId,
          toStatus,
          actorId,
          note,
          txContext,
        );
        if (!invoiceSynchronized) return undefined;
      }
    }
    return order;
  }

  async synchronizeInvoiceForOrder(
    invoiceId: number,
    orderStatus: Exclude<OrderStatus, undefined>,
    actorId: number,
    note: string | undefined,
    txContext: TXContext,
  ) {
    if (orderStatus === "shipped" || orderStatus === "delivered") {
      const sent = await this.transitionInvoiceStatus(
        invoiceId,
        "sent",
        actorId,
        note,
        txContext,
      );
      if (!sent) return false;
    }
    if (orderStatus === "delivered") {
      const delivered = await this.transitionInvoiceStatus(
        invoiceId,
        "delivered",
        actorId,
        note,
        txContext,
      );
      if (!delivered) return false;
    }
    if (orderStatus === "cancelled") {
      return this.transitionInvoiceStatus(
        invoiceId,
        "cancelled",
        actorId,
        note,
        txContext,
      );
    }
    return true;
  }

  async synchronizeOrderForInvoiceStatus(
    invoiceId: number,
    invoiceStatus: "sent" | "delivered" | "cancelled",
    actorId: number,
    note: string | undefined,
    txContext: TXContext,
  ) {
    const [order] = await txContext
      .select()
      .from(orders)
      .where(eq(orders.invoiceId, invoiceId))
      .for("update");
    if (!order) return undefined;

    const targetStatus =
      invoiceStatus === "sent"
        ? "shipped"
        : invoiceStatus === "delivered"
          ? "delivered"
          : "cancelled";
    if (order.status === targetStatus) return order;
    if (
      (targetStatus === "shipped" && order.status !== "ready_to_ship") ||
      (targetStatus === "delivered" && order.status !== "shipped") ||
      (targetStatus === "cancelled" &&
        ["shipped", "delivered", "cancelled"].includes(order.status))
    ) {
      return undefined;
    }

    return this.updateStatus(
      order.id,
      order.status,
      targetStatus,
      actorId,
      note,
      txContext,
      false,
    );
  }

  private async transitionInvoiceStatus(
    invoiceId: number,
    targetStatus: "sent" | "delivered" | "cancelled",
    actorId: number,
    note: string | undefined,
    txContext: TXContext,
  ) {
    const [invoice] = await txContext
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .for("update");
    if (
      !invoice ||
      invoice.status === "paid" ||
      invoice.status === targetStatus
    ) {
      return invoice != null;
    }

    const allowed =
      (targetStatus === "sent" && invoice.status === "pending") ||
      (targetStatus === "delivered" && invoice.status === "sent") ||
      (targetStatus === "cancelled" &&
        ["pending", "sent"].includes(invoice.status));
    if (!allowed) {
      return false;
    }

    const [updated] = await txContext
      .update(invoices)
      .set({ status: targetStatus, updatedAt: new Date() })
      .where(
        and(eq(invoices.id, invoice.id), eq(invoices.status, invoice.status)),
      )
      .returning();
    if (!updated) {
      return false;
    }
    await txContext.insert(invoiceStatusEvents).values({
      invoiceId: invoice.id,
      previousStatus: invoice.status,
      status: targetStatus,
      changedBy: actorId,
      reason: note ?? "Synchronized from order lifecycle",
    });
    return true;
  }
}
