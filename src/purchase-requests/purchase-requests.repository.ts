import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, exists, gt, lt, sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, DBContext } from "../database/database.types";
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
    db: DBContext = this.db,
  ) {
    return db
      .select({ qty: purchaseRequestItems.qty })
      .from(purchaseRequestItems)
      .innerJoin(
        purchaseRequests,
        eq(purchaseRequestItems.purchaseRequestId, purchaseRequests.id),
      )
      .where(
        and(
          eq(purchaseRequests.requesterId, userId),
          eq(purchaseRequests.status, "new"),
          gt(purchaseRequests.expiresAt, now),
          eq(purchaseRequestItems.storeInventoryId, storeInventoryId),
        ),
      );
  }

  async findLatestActiveRequestForUserStore(
    userId: number,
    storeId: number,
    now: Date,
    db: DBContext = this.db,
  ) {
    const [row] = await db
      .select()
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.requesterId, userId),
          eq(purchaseRequests.storeId, storeId),
          eq(purchaseRequests.status, "new"),
          gt(purchaseRequests.expiresAt, now),
        ),
      )
      .orderBy(desc(purchaseRequests.id))
      .limit(1);

    return row;
  }

  async createRequest(data: NewPurchaseRequest, db: DBContext = this.db) {
    const [created] = await db
      .insert(purchaseRequests)
      .values(data)
      .returning();
    return created;
  }

  async touchRequestExpiry(
    requestId: number,
    expiresAt: Date,
    db: DBContext = this.db,
  ) {
    await db
      .update(purchaseRequests)
      .set({ expiresAt, updatedAt: new Date() })
      .where(eq(purchaseRequests.id, requestId));
  }

  async createItem(data: NewPurchaseRequestItem, db: DBContext = this.db) {
    const [created] = await db
      .insert(purchaseRequestItems)
      .values(data)
      .returning();
    return created;
  }

  async getItemWithRequestForRemoval(itemId: number, db: DBContext = this.db) {
    const [item] = await db
      .select({
        id: purchaseRequestItems.id,
        qty: purchaseRequestItems.qty,
        storeInventoryId: purchaseRequestItems.storeInventoryId,
        purchaseRequestId: purchaseRequestItems.purchaseRequestId,
        requesterId: purchaseRequests.requesterId,
        purchaseRequestStatus: purchaseRequests.status,
      })
      .from(purchaseRequestItems)
      .innerJoin(
        purchaseRequests,
        eq(purchaseRequestItems.purchaseRequestId, purchaseRequests.id),
      )
      .where(eq(purchaseRequestItems.id, itemId))
      .limit(1);

    return item;
  }

  async deleteItemForOpenRequest(
    itemId: number,
    purchaseRequestId: number,
    requesterId: number,
    db: DBContext = this.db,
  ) {
    const [removed] = await db
      .delete(purchaseRequestItems)
      .where(
        and(
          eq(purchaseRequestItems.id, itemId),
          eq(purchaseRequestItems.purchaseRequestId, purchaseRequestId),
          exists(
            db
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
    db: DBContext = this.db,
  ) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(purchaseRequestItems)
      .where(eq(purchaseRequestItems.purchaseRequestId, purchaseRequestId));

    return row?.count ?? 0;
  }

  async setRequestCancelled(
    purchaseRequestId: number,
    db: DBContext = this.db,
  ): Promise<void> {
    await db
      .update(purchaseRequests)
      .set({ status: "cancelled", totalAmount: 0, updatedAt: new Date() })
      .where(eq(purchaseRequests.id, purchaseRequestId));
  }

  findActiveWithItemsByRequester(requesterId: number, db: DBContext = this.db) {
    return db.query.purchaseRequests.findFirst({
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

  async findById(id: number, db: DBContext = this.db) {
    const [row] = await db
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    return row;
  }

  listItemsByRequestId(purchaseRequestId: number, db: DBContext = this.db) {
    return db
      .select()
      .from(purchaseRequestItems)
      .where(eq(purchaseRequestItems.purchaseRequestId, purchaseRequestId));
  }

  async createInvoice(data: NewInvoice, db: DBContext = this.db) {
    const [invoice] = await db.insert(invoices).values(data).returning();
    return invoice;
  }

  async createInvoiceItem(
    data: NewInvoiceItem,
    db: DBContext = this.db,
  ): Promise<void> {
    await db.insert(invoiceItems).values(data);
  }

  async setRequestConfirmed(
    purchaseRequestId: number,
    db: DBContext = this.db,
  ): Promise<void> {
    await db
      .update(purchaseRequests)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(purchaseRequests.id, purchaseRequestId));
  }

  findExpiredOpenRequestIds(now: Date, db: DBContext = this.db) {
    return db.query.purchaseRequests.findMany({
      columns: { id: true },
      where: (table) => and(eq(table.status, "new"), lt(table.expiresAt, now)),
    });
  }

  async findExpiredOpenById(
    requestId: number,
    now: Date,
    db: DBContext = this.db,
  ) {
    const [row] = await db
      .select()
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.id, requestId),
          eq(purchaseRequests.status, "new"),
          lt(purchaseRequests.expiresAt, now),
        ),
      )
      .limit(1);

    return row;
  }

  async setRequestExpired(
    purchaseRequestId: number,
    db: DBContext = this.db,
  ): Promise<void> {
    await db
      .update(purchaseRequests)
      .set({ status: "expired", totalAmount: 0, updatedAt: new Date() })
      .where(eq(purchaseRequests.id, purchaseRequestId));
  }

  async recalculateTotal(
    purchaseRequestId: number,
    db: DBContext = this.db,
  ): Promise<void> {
    const [row] = await db
      .select({
        total: sql<number>`coalesce(sum(${purchaseRequestItems.total}), 0)::numeric`,
      })
      .from(purchaseRequestItems)
      .where(eq(purchaseRequestItems.purchaseRequestId, purchaseRequestId));

    await db
      .update(purchaseRequests)
      .set({ totalAmount: row?.total ?? 0, updatedAt: new Date() })
      .where(eq(purchaseRequests.id, purchaseRequestId));
  }
}
