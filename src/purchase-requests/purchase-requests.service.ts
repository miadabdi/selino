import {
  HttpStatus,
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import { throwHttpError } from "../common/http-error.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import {
  invoiceItems,
  invoices,
  purchaseRequestItems,
  purchaseRequests,
} from "../database/schema/index.js";
import { InventoriesService } from "../inventories/inventories.service.js";
import { AddPurchaseRequestItemDto } from "./dto/add-purchase-request-item.dto.js";

@Injectable()
export class PurchaseRequestsService implements OnModuleInit, OnModuleDestroy {
  private intervalRef?: NodeJS.Timeout;
  private isRunningExpiry = false;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly inventoriesService: InventoriesService,
  ) {}

  onModuleInit() {
    this.intervalRef = setInterval(() => {
      void this.expireOpenPurchaseRequests();
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  async addItem(userId: number, dto: AddPurchaseRequestItemDto) {
    const inventory = await this.inventoriesService.findInventoryById(
      dto.storeInventoryId,
    );

    return this.db.transaction(async (tx) => {
      const activeReservationRows = await tx
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
            gt(purchaseRequests.expiresAt, new Date()),
            eq(purchaseRequestItems.storeInventoryId, dto.storeInventoryId),
          ),
        );

      const existingQty = activeReservationRows.reduce(
        (sum, row) => sum + row.qty,
        0,
      );
      if (
        inventory.maxOrderQty != null &&
        existingQty + dto.qty > inventory.maxOrderQty
      ) {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Quantity exceeds max_order_qty",
          "qty",
        );
      }

      const [existingRequest] = await tx
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.requesterId, userId),
            eq(purchaseRequests.storeId, inventory.storeId),
            eq(purchaseRequests.status, "new"),
            gt(purchaseRequests.expiresAt, new Date()),
          ),
        )
        .orderBy(desc(purchaseRequests.id))
        .limit(1);

      let requestId = existingRequest?.id;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      if (!requestId) {
        const [createdRequest] = await tx
          .insert(purchaseRequests)
          .values({
            requesterId: userId,
            storeId: inventory.storeId,
            status: "new",
            expiresAt,
          })
          .returning();

        requestId = createdRequest.id;
      } else {
        await tx
          .update(purchaseRequests)
          .set({ expiresAt, updatedAt: new Date() })
          .where(eq(purchaseRequests.id, requestId));
      }

      await this.inventoriesService.reserveStockAtomic(
        tx,
        inventory.id,
        dto.qty,
        `purchase_request:${requestId}`,
        userId,
      );

      const [item] = await tx
        .insert(purchaseRequestItems)
        .values({
          purchaseRequestId: requestId,
          productId: inventory.productId,
          storeInventoryId: inventory.id,
          qty: dto.qty,
          price: inventory.price,
          total: inventory.price * dto.qty,
        })
        .returning();

      await this.recalculatePurchaseRequestTotal(tx, requestId);

      return item;
    });
  }

  async removeItem(userId: number, itemId: number) {
    return this.db.transaction(async (tx) => {
      const [item] = await tx
        .select({
          id: purchaseRequestItems.id,
          qty: purchaseRequestItems.qty,
          storeInventoryId: purchaseRequestItems.storeInventoryId,
          purchaseRequestId: purchaseRequestItems.purchaseRequestId,
        })
        .from(purchaseRequestItems)
        .innerJoin(
          purchaseRequests,
          eq(purchaseRequestItems.purchaseRequestId, purchaseRequests.id),
        )
        .where(
          and(
            eq(purchaseRequestItems.id, itemId),
            eq(purchaseRequests.requesterId, userId),
            eq(purchaseRequests.status, "new"),
          ),
        )
        .limit(1);

      if (!item) {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
      }

      await tx
        .delete(purchaseRequestItems)
        .where(eq(purchaseRequestItems.id, item.id));

      if (item.storeInventoryId != null) {
        await this.inventoriesService.releaseReservedStockAtomic(
          tx,
          item.storeInventoryId,
          item.qty,
          "cancellation",
          `purchase_request:${item.purchaseRequestId}`,
          userId,
        );
      }

      const [remaining] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(purchaseRequestItems)
        .where(
          eq(purchaseRequestItems.purchaseRequestId, item.purchaseRequestId),
        );

      if ((remaining?.count ?? 0) === 0) {
        await tx
          .update(purchaseRequests)
          .set({ status: "cancelled", totalAmount: 0, updatedAt: new Date() })
          .where(eq(purchaseRequests.id, item.purchaseRequestId));
      } else {
        await this.recalculatePurchaseRequestTotal(tx, item.purchaseRequestId);
      }

      return { message: "Purchase request item removed" };
    });
  }

  async getActive(userId: number) {
    const [request] = await this.db
      .select()
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.requesterId, userId),
          eq(purchaseRequests.status, "new"),
          gt(purchaseRequests.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(purchaseRequests.updatedAt), desc(purchaseRequests.id))
      .limit(1);

    if (!request) {
      return null;
    }

    const items = await this.db
      .select()
      .from(purchaseRequestItems)
      .where(eq(purchaseRequestItems.purchaseRequestId, request.id));

    return { ...request, items };
  }

  async getRequesterIdById(purchaseRequestId: number): Promise<number | null> {
    const [request] = await this.db
      .select({ requesterId: purchaseRequests.requesterId })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, purchaseRequestId))
      .limit(1);

    return request?.requesterId ?? null;
  }

  async getRequesterIdByItemId(itemId: number): Promise<number | null> {
    const [item] = await this.db
      .select({ requesterId: purchaseRequests.requesterId })
      .from(purchaseRequestItems)
      .innerJoin(
        purchaseRequests,
        eq(purchaseRequestItems.purchaseRequestId, purchaseRequests.id),
      )
      .where(eq(purchaseRequestItems.id, itemId))
      .limit(1);

    return item?.requesterId ?? null;
  }

  async confirm(userId: number, id: number) {
    return this.db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, id),
            eq(purchaseRequests.requesterId, userId),
            eq(purchaseRequests.status, "new"),
            gt(purchaseRequests.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!request) {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Purchase request is invalid, expired, or already processed",
        );
      }

      const items = await tx
        .select()
        .from(purchaseRequestItems)
        .where(eq(purchaseRequestItems.purchaseRequestId, request.id));

      if (items.length === 0) {
        throwHttpError(HttpStatus.BAD_REQUEST, "Purchase request has no items");
      }

      const invoiceNumber = `INV-${Date.now()}-${request.id}`;

      const [invoice] = await tx
        .insert(invoices)
        .values({
          storeId: request.storeId!,
          buyerId: userId,
          purchaseRequestId: request.id,
          invoiceNumber,
          status: "pending",
          totalAmount: request.totalAmount,
          currency: "IRR",
        })
        .returning();

      for (const item of items) {
        await tx.insert(invoiceItems).values({
          invoiceId: invoice.id,
          productId: item.productId,
          storeInventoryId: item.storeInventoryId,
          description: null,
          qty: item.qty,
          unitPrice: item.price,
          total: item.total,
        });

        if (item.storeInventoryId == null) {
          throwHttpError(HttpStatus.CONFLICT, "Inventory linkage missing");
        }

        await this.inventoriesService.consumeReservedStockAtomic(
          tx,
          item.storeInventoryId,
          item.qty,
          `invoice:${invoice.id}`,
          userId,
        );
      }

      await tx
        .update(purchaseRequests)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(eq(purchaseRequests.id, request.id));

      return invoice;
    });
  }

  async cancel(userId: number, id: number) {
    return this.db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, id),
            eq(purchaseRequests.requesterId, userId),
            eq(purchaseRequests.status, "new"),
          ),
        )
        .limit(1);

      if (!request) {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request not found");
      }

      const items = await tx
        .select()
        .from(purchaseRequestItems)
        .where(eq(purchaseRequestItems.purchaseRequestId, request.id));

      for (const item of items) {
        if (item.storeInventoryId == null) {
          continue;
        }

        await this.inventoriesService.releaseReservedStockAtomic(
          tx,
          item.storeInventoryId,
          item.qty,
          "cancellation",
          `purchase_request:${request.id}`,
          userId,
        );
      }

      await tx
        .update(purchaseRequests)
        .set({ status: "cancelled", totalAmount: 0, updatedAt: new Date() })
        .where(eq(purchaseRequests.id, request.id));

      return { message: "Purchase request cancelled" };
    });
  }

  async expireOpenPurchaseRequests() {
    if (this.isRunningExpiry) {
      return;
    }

    this.isRunningExpiry = true;

    try {
      const expiredRequests = await this.db
        .select({ id: purchaseRequests.id })
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.status, "new"),
            lt(purchaseRequests.expiresAt, new Date()),
          ),
        );

      for (const request of expiredRequests) {
        await this.db.transaction(async (tx) => {
          const [activeRequest] = await tx
            .select()
            .from(purchaseRequests)
            .where(
              and(
                eq(purchaseRequests.id, request.id),
                eq(purchaseRequests.status, "new"),
                lt(purchaseRequests.expiresAt, new Date()),
              ),
            )
            .limit(1);

          if (!activeRequest) {
            return;
          }

          const items = await tx
            .select()
            .from(purchaseRequestItems)
            .where(
              eq(purchaseRequestItems.purchaseRequestId, activeRequest.id),
            );

          for (const item of items) {
            if (item.storeInventoryId == null) {
              continue;
            }

            await this.inventoriesService.releaseReservedStockAtomic(
              tx,
              item.storeInventoryId,
              item.qty,
              "reservation_expired",
              `purchase_request:${activeRequest.id}`,
              activeRequest.requesterId,
            );
          }

          await tx
            .update(purchaseRequests)
            .set({ status: "expired", totalAmount: 0, updatedAt: new Date() })
            .where(eq(purchaseRequests.id, activeRequest.id));
        });
      }
    } finally {
      this.isRunningExpiry = false;
    }
  }

  private async recalculatePurchaseRequestTotal(
    tx: any,
    purchaseRequestId: number,
  ) {
    const [row] = await tx
      .select({
        total: sql<number>`coalesce(sum(${purchaseRequestItems.total}), 0)::numeric`,
      })
      .from(purchaseRequestItems)
      .where(eq(purchaseRequestItems.purchaseRequestId, purchaseRequestId));

    await tx
      .update(purchaseRequests)
      .set({ totalAmount: row?.total ?? 0, updatedAt: new Date() })
      .where(eq(purchaseRequests.id, purchaseRequestId));
  }
}
