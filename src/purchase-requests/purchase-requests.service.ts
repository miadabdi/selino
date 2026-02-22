import { subject } from "@casl/ability";
import {
  HttpStatus,
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { and, desc, eq, exists, gt, lt, sql } from "drizzle-orm";
import { Action, CaslAbilityFactory } from "../auth/casl/index.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
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
    private readonly caslAbilityFactory: CaslAbilityFactory,
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

    if (!inventory) {
      throwHttpError(HttpStatus.NOT_FOUND, "Store inventory not found");
    }

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

      await this.inventoriesService.reserveStock(inventory.id, dto.qty);

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

  async removeItem(user: AuthenticatedUser, itemId: number) {
    return this.db.transaction(async (tx) => {
      const [item] = await tx
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

      if (!item) {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
      }

      this.assertCanUpdatePurchaseRequest(user, item.requesterId);

      if (item.purchaseRequestStatus !== "new") {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
      }

      const [removedItem] = await tx
        .delete(purchaseRequestItems)
        .where(
          and(
            eq(purchaseRequestItems.id, item.id),
            eq(purchaseRequestItems.purchaseRequestId, item.purchaseRequestId),
            exists(
              tx
                .select({ id: purchaseRequests.id })
                .from(purchaseRequests)
                .where(
                  and(
                    eq(purchaseRequests.id, item.purchaseRequestId),
                    eq(purchaseRequests.requesterId, item.requesterId),
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

      if (!removedItem) {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
      }

      if (removedItem.storeInventoryId != null) {
        await this.inventoriesService.releaseReservedStock(
          removedItem.storeInventoryId,
          removedItem.qty,
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
    return (
      (await this.db.query.purchaseRequests.findFirst({
        where: (table) =>
          and(
            eq(table.requesterId, userId),
            eq(table.status, "new"),
            gt(table.expiresAt, new Date()),
          ),
        orderBy: (table) => [desc(table.updatedAt), desc(table.id)],
        with: {
          items: true,
        },
      })) ?? null
    );
  }

  async confirm(user: AuthenticatedUser, id: number) {
    return this.db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, id))
        .limit(1);

      if (!request) {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Purchase request is invalid, expired, or already processed",
        );
      }

      this.assertCanUpdatePurchaseRequest(user, request.requesterId);

      if (
        request.status !== "new" ||
        request.expiresAt == null ||
        request.expiresAt <= new Date()
      ) {
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
          buyerId: user.id,
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
          user.id,
        );
      }

      await tx
        .update(purchaseRequests)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(eq(purchaseRequests.id, request.id));

      return invoice;
    });
  }

  async cancel(user: AuthenticatedUser, id: number) {
    return this.db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, id))
        .limit(1);

      if (!request) {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request not found");
      }

      this.assertCanUpdatePurchaseRequest(user, request.requesterId);

      if (request.status !== "new") {
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

        await this.inventoriesService.releaseReservedStock(
          item.storeInventoryId,
          item.qty,
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
      const expiredRequests = await this.db.query.purchaseRequests.findMany({
        columns: { id: true },
        where: (table) =>
          and(eq(table.status, "new"), lt(table.expiresAt, new Date())),
      });

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

            await this.inventoriesService.releaseReservedStock(
              item.storeInventoryId,
              item.qty,
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

  private assertCanUpdatePurchaseRequest(
    user: AuthenticatedUser,
    requesterId: number,
  ) {
    const ability = this.caslAbilityFactory.createForUser(user);
    const canUpdatePurchaseRequest = ability.can(
      Action.Update,
      subject("PurchaseRequest", { requesterId }),
    );

    if (!canUpdatePurchaseRequest) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "You do not have permission for this action",
      );
    }
  }
}
