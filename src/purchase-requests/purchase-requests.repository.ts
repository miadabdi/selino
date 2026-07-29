import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  desc,
  eq,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  invoiceItems,
  invoices,
  purchaseRequestItems,
  purchaseRequestStatusEvents,
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

  async findLatestActiveRequestForBuyerBusinessAccount(
    userId: number,
    buyerBusinessAccountId: number,
    now: Date,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.purchaseRequests.findFirst({
      where: (table) =>
        and(
          eq(table.requesterId, userId),
          eq(table.buyerBusinessAccountId, buyerBusinessAccountId),
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
            buyerBusinessAccountId: true,
            requesterId: true,
            status: true,
          },
        },
      },
    });
  }

  async findItemWithRequestForUpdate(itemId: number, txContext: TXContext) {
    const [row] = await txContext
      .select({
        id: purchaseRequestItems.id,
        qty: purchaseRequestItems.qty,
        price: purchaseRequestItems.price,
        storeInventoryId: purchaseRequestItems.storeInventoryId,
        purchaseRequestId: purchaseRequestItems.purchaseRequestId,
        buyerBusinessAccountId: purchaseRequests.buyerBusinessAccountId,
        requesterId: purchaseRequests.requesterId,
        status: purchaseRequests.status,
        expiresAt: purchaseRequests.expiresAt,
      })
      .from(purchaseRequestItems)
      .innerJoin(
        purchaseRequests,
        eq(purchaseRequests.id, purchaseRequestItems.purchaseRequestId),
      )
      .where(eq(purchaseRequestItems.id, itemId))
      .limit(1)
      .for("update");

    if (!row) return undefined;

    return {
      id: row.id,
      qty: row.qty,
      price: row.price,
      storeInventoryId: row.storeInventoryId,
      purchaseRequestId: row.purchaseRequestId,
      purchaseRequest: {
        buyerBusinessAccountId: row.buyerBusinessAccountId,
        requesterId: row.requesterId,
        status: row.status,
        expiresAt: row.expiresAt,
      },
    };
  }

  async updateItemQuantityForOpenRequest(
    itemId: number,
    purchaseRequestId: number,
    qty: number,
    price: number,
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
      .update(purchaseRequestItems)
      .set({
        qty,
        total: price * qty,
      })
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
                  eq(purchaseRequests.status, "new"),
                  gt(purchaseRequests.expiresAt, new Date()),
                ),
              ),
          ),
        ),
      )
      .returning();

    return updated;
  }

  async deleteItemForOpenRequest(
    itemId: number,
    purchaseRequestId: number,
    buyerBusinessAccountId: number,
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
                  eq(
                    purchaseRequests.buyerBusinessAccountId,
                    buyerBusinessAccountId,
                  ),
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
    buyerBusinessAccountId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.purchaseRequests.findFirst({
      where: (table) =>
        and(
          eq(table.requesterId, requesterId),
          eq(table.buyerBusinessAccountId, buyerBusinessAccountId),
          eq(table.status, "new"),
          gt(table.expiresAt, new Date()),
        ),
      orderBy: (table) => [desc(table.updatedAt), desc(table.id)],
      with: {
        items: {
          with: {
            product: true,
            storeInventory: {
              with: {
                businessAccount: true,
              },
            },
          },
        },
      },
    });
  }

  async listByBuyerBusiness(
    buyerBusinessAccountId: number | undefined,
    page: number,
    limit: number,
    requesterId?: number,
    filters?: {
      status?:
        | "new"
        | "pending_credit_approval"
        | "confirmed"
        | "cancelled"
        | "expired";
      statuses?: readonly (
        | "new"
        | "pending_credit_approval"
        | "confirmed"
        | "cancelled"
        | "expired"
      )[];
      search?: string;
      from?: string;
      to?: string;
    },
    txContext: TXContext = this.db,
  ) {
    const conditions: SQL[] = [];
    if (buyerBusinessAccountId != null) {
      conditions.push(
        eq(purchaseRequests.buyerBusinessAccountId, buyerBusinessAccountId),
      );
    }
    if (requesterId != null) {
      conditions.push(eq(purchaseRequests.requesterId, requesterId));
    }
    if (filters?.status != null) {
      conditions.push(eq(purchaseRequests.status, filters.status));
    }
    if (filters?.statuses?.length) {
      conditions.push(inArray(purchaseRequests.status, filters.statuses));
    }
    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(purchaseRequests.code, term),
          ilike(purchaseRequests.notes, term),
        )!,
      );
    }
    if (filters?.from != null) {
      conditions.push(gte(purchaseRequests.createdAt, new Date(filters.from)));
    }
    if (filters?.to != null) {
      conditions.push(lte(purchaseRequests.createdAt, new Date(filters.to)));
    }
    const condition = conditions.length > 0 ? and(...conditions) : undefined;
    const [items, countRows] = await Promise.all([
      txContext.query.purchaseRequests.findMany({
        where: condition,
        with: {
          buyerBusinessAccount: true,
          items: {
            with: {
              product: true,
              storeInventory: {
                with: {
                  businessAccount: true,
                },
              },
            },
          },
          invoices: true,
        },
        orderBy: (table) => [desc(table.createdAt), desc(table.id)],
        limit,
        offset: (page - 1) * limit,
      }),
      txContext
        .select({ total: sql<number>`count(*)::int` })
        .from(purchaseRequests)
        .where(condition),
    ]);

    return {
      items,
      page,
      limit,
      total: countRows[0]?.total ?? 0,
    };
  }

  async findById(id: number, txContext: TXContext = this.db) {
    return txContext.query.purchaseRequests.findFirst({
      where: (table) => eq(table.id, id),
    });
  }

  findDetailedById(id: number, txContext: TXContext = this.db) {
    return txContext.query.purchaseRequests.findFirst({
      where: (table) => eq(table.id, id),
      with: {
        buyerBusinessAccount: true,
        items: {
          with: {
            product: true,
            storeInventory: {
              with: {
                businessAccount: true,
              },
            },
          },
        },
        invoices: {
          with: {
            supplierBusinessAccount: true,
          },
        },
        tradeCreditApprovalRequests: true,
        statusEvents: {
          orderBy: (table) => [desc(table.createdAt), desc(table.id)],
        },
      },
    });
  }

  async findByIdForUpdate(id: number, txContext: TXContext) {
    const [request] = await txContext
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1)
      .for("update");
    return request;
  }

  async requesterHasActiveMembership(
    requesterId: number,
    businessAccountId: number,
    txContext: TXContext = this.db,
  ) {
    const membership = await txContext.query.businessMembers.findFirst({
      columns: { id: true },
      where: (table) =>
        and(
          eq(table.userId, requesterId),
          eq(table.businessAccountId, businessAccountId),
          eq(table.isActive, true),
        ),
    });

    return membership != null;
  }

  listItemsByRequestId(
    purchaseRequestId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.purchaseRequestItems.findMany({
      where: (table) => eq(table.purchaseRequestId, purchaseRequestId),
      with: {
        storeInventory: true,
      },
    });
  }

  listInvoicesByPurchaseRequestId(
    purchaseRequestId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.invoices.findMany({
      where: (table) => eq(table.purchaseRequestId, purchaseRequestId),
      orderBy: (table) => [desc(table.id)],
    });
  }

  async listActiveSellerRecipients(
    businessAccountId: number,
    txContext: TXContext = this.db,
  ) {
    const memberships = await txContext.query.businessMembers.findMany({
      where: (table) =>
        and(
          eq(table.businessAccountId, businessAccountId),
          eq(table.isActive, true),
        ),
      with: {
        role: true,
        user: true,
      },
    });
    return memberships
      .filter((membership) => membership.role.name === "seller")
      .map((membership) => membership.user);
  }

  async createInvoice(data: NewInvoice, txContext: TXContext = this.db) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const [invoice] = await txContext
        .insert(invoices)
        .values(data)
        .onConflictDoNothing({ target: invoices.invoiceNumber })
        .returning();
      if (invoice) {
        return invoice;
      }
    }

    throw new Error(
      "Failed to allocate a unique random invoice number after 20 attempts",
    );
  }

  async createInvoiceItem(
    data: NewInvoiceItem,
    txContext: TXContext = this.db,
  ) {
    const [created] = await txContext
      .insert(invoiceItems)
      .values(data)
      .returning();
    return created;
  }

  async setInvoiceStatus(
    invoiceId: number,
    status:
      | "pending_credit_approval"
      | "pending"
      | "sent"
      | "delivered"
      | "paid"
      | "rejected"
      | "expired",
    txContext: TXContext = this.db,
  ) {
    const [invoice] = await txContext
      .update(invoices)
      .set({ status, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId))
      .returning();
    return invoice;
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

  async setRequestPendingCreditApproval(
    purchaseRequestId: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(purchaseRequests)
      .set({ status: "pending_credit_approval", updatedAt: new Date() })
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

  async recordStatusEvent(
    purchaseRequestId: number,
    previousStatus:
      | "new"
      | "pending_credit_approval"
      | "confirmed"
      | "cancelled"
      | "expired"
      | null,
    status:
      | "new"
      | "pending_credit_approval"
      | "confirmed"
      | "cancelled"
      | "expired",
    changedBy: number | null,
    reason: string | null,
    txContext: TXContext = this.db,
  ) {
    await txContext.insert(purchaseRequestStatusEvents).values({
      purchaseRequestId,
      previousStatus,
      status,
      changedBy,
      reason,
    });
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
