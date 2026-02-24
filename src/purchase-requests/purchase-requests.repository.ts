import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, exists, gt, lt, sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  invoiceItems,
  invoices,
  purchaseRequestItems,
  purchaseRequests,
  type NewInvoice,
  type NewInvoiceItem,
  type NewPurchaseRequest,
  type NewPurchaseRequestItem,
} from "../database/schema/index";

@Injectable()
export class PurchaseRequestsRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  findActiveReservationRows(
    userId: number,
    storeInventoryId: number,
    now: Date,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.purchaseRequests
      .findMany({
        columns: {
          id: true,
        },
        where: (table) =>
          and(
            eq(table.requesterId, userId),
            eq(table.status, "new"),
            gt(table.expiresAt, now),
          ),
        with: {
          items: {
            columns: {
              qty: true,
            },
            where: (table) => eq(table.storeInventoryId, storeInventoryId),
          },
        },
      })
      .then((rows) => rows.flatMap((row) => row.items));
  }

  async findLatestActiveRequestForUserStore(
    userId: number,
    storeId: number,
    now: Date,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.purchaseRequests.findFirst({
      where: (table) =>
        and(
          eq(table.requesterId, userId),
          eq(table.storeId, storeId),
          eq(table.status, "new"),
          gt(table.expiresAt, now),
        ),
      orderBy: (table) => [desc(table.id)],
    });
  }

  async createRequest(
    data: NewPurchaseRequest,
    txContext: TXContext = this.db,
  ) {
    const [created] = await txContext
      .insert(purchaseRequests)
      .values(data)
      .returning();
    return created;
  }

  async touchRequestExpiry(
    requestId: number,
    expiresAt: Date,
    txContext: TXContext = this.db,
  ) {
    await txContext
      .update(purchaseRequests)
      .set({ expiresAt, updatedAt: new Date() })
      .where(eq(purchaseRequests.id, requestId));
  }

  async createItem(
    data: NewPurchaseRequestItem,
    txContext: TXContext = this.db,
  ) {
    const [created] = await txContext
      .insert(purchaseRequestItems)
      .values(data)
      .returning();
    return created;
  }

  async getItemWithRequestForRemoval(
    itemId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.purchaseRequestItems.findFirst({
      columns: {
        id: true,
        qty: true,
        storeInventoryId: true,
        purchaseRequestId: true,
      },
      where: (table) => eq(table.id, itemId),
      with: {
        purchaseRequest: {
          columns: {
            requesterId: true,
            status: true,
          },
        },
      },
    });
  }

  async deleteItemForOpenRequest(
    itemId: number,
    purchaseRequestId: number,
    requesterId: number,
    txContext: TXContext = this.db,
  ) {
    const [removed] = await txContext
      .delete(purchaseRequestItems)
      .where(
        and(
          eq(purchaseRequestItems.id, itemId),
          eq(purchaseRequestItems.purchaseRequestId, purchaseRequestId),
          exists(
            txContext
              .select({ id: purchaseRequests.id })
              .from(purchaseRequests)
              .where(
                and(
                  eq(purchaseRequests.id, purchaseRequestId),
                  eq(purchaseRequests.requesterId, requesterId),
                  eq(purchaseRequests.status, "new"),
                ),
              ),
          ),
        ),
      )
      .returning({
        qty: purchaseRequestItems.qty,
        storeInventoryId: purchaseRequestItems.storeInventoryId,
      });

    return removed;
  }

  async countItemsByRequestId(
    purchaseRequestId: number,
    txContext: TXContext = this.db,
  ) {
    const [row] = await txContext
      .select({ count: sql<number>`count(*)::int` })
      .from(purchaseRequestItems)
      .where(eq(purchaseRequestItems.purchaseRequestId, purchaseRequestId));

    return row?.count ?? 0;
  }

  async setRequestCancelled(
    purchaseRequestId: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(purchaseRequests)
      .set({ status: "cancelled", totalAmount: 0, updatedAt: new Date() })
      .where(eq(purchaseRequests.id, purchaseRequestId));
  }

  findActiveWithItemsByRequester(
    requesterId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.purchaseRequests.findFirst({
      where: (table) =>
        and(
          eq(table.requesterId, requesterId),
          eq(table.status, "new"),
          gt(table.expiresAt, new Date()),
        ),
      orderBy: (table) => [desc(table.updatedAt), desc(table.id)],
      with: {
        items: true,
      },
    });
  }

  async findById(id: number, txContext: TXContext = this.db) {
    return txContext.query.purchaseRequests.findFirst({
      where: (table) => eq(table.id, id),
    });
  }

  listItemsByRequestId(
    purchaseRequestId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.purchaseRequestItems.findMany({
      where: (table) => eq(table.purchaseRequestId, purchaseRequestId),
    });
  }

  async createInvoice(data: NewInvoice, txContext: TXContext = this.db) {
    const [invoice] = await txContext.insert(invoices).values(data).returning();
    return invoice;
  }

  async createInvoiceItem(
    data: NewInvoiceItem,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext.insert(invoiceItems).values(data);
  }

  async setRequestConfirmed(
    purchaseRequestId: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(purchaseRequests)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(purchaseRequests.id, purchaseRequestId));
  }

  findExpiredOpenRequestIds(now: Date, txContext: TXContext = this.db) {
    return txContext.query.purchaseRequests.findMany({
      columns: {
        id: true,
      },
      where: (table) => and(eq(table.status, "new"), lt(table.expiresAt, now)),
    });
  }

  async findExpiredOpenById(
    requestId: number,
    now: Date,
    forUpdate: boolean = false,
    txContext: TXContext = this.db,
  ) {
    const whereClause = and(
      eq(purchaseRequests.id, requestId),
      eq(purchaseRequests.status, "new"),
      lt(purchaseRequests.expiresAt, now),
    );

    if (forUpdate) {
      const [row] = await txContext
        .select()
        .from(purchaseRequests)
        .where(whereClause)
        .limit(1)
        .for("update", { skipLocked: true });

      return row;
    }

    return txContext.query.purchaseRequests.findFirst({
      where: (table) =>
        and(
          eq(table.id, requestId),
          eq(table.status, "new"),
          lt(table.expiresAt, now),
        ),
    });
  }

  async setRequestExpired(
    purchaseRequestId: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(purchaseRequests)
      .set({ status: "expired", totalAmount: 0, updatedAt: new Date() })
      .where(eq(purchaseRequests.id, purchaseRequestId));
  }

  async recalculateTotal(
    purchaseRequestId: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    const [row] = await txContext
      .select({
        total: sql<number>`coalesce(sum(${purchaseRequestItems.total}), 0)::numeric`,
      })
      .from(purchaseRequestItems)
      .where(eq(purchaseRequestItems.purchaseRequestId, purchaseRequestId));

    await txContext
      .update(purchaseRequests)
      .set({ totalAmount: row?.total ?? 0, updatedAt: new Date() })
      .where(eq(purchaseRequests.id, purchaseRequestId));
  }
}
