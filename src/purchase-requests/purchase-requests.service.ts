import { subject } from "@casl/ability";
import {
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Action, CaslAbilityFactory } from "../auth/casl/index";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { throwHttpError } from "../common/http-error";
import { InventoriesService } from "../inventories/inventories.service";
import { AddPurchaseRequestItemDto } from "./dto/add-purchase-request-item.dto";
import { PurchaseRequestsRepository } from "./purchase-requests.repository";

@Injectable()
export class PurchaseRequestsService implements OnModuleInit, OnModuleDestroy {
  private intervalRef?: NodeJS.Timeout;
  private isRunningExpiry = false;
  private readonly requestExpiryCheckIntervalMs: number;
  private readonly requestActiveWindowMinutes: number;

  constructor(
    private readonly purchaseRequestsRepository: PurchaseRequestsRepository,
    private readonly inventoriesService: InventoriesService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly configService: ConfigService,
  ) {
    this.requestExpiryCheckIntervalMs = this.configService.getOrThrow<number>(
      "PURCHASE_REQUEST_EXPIRY_CHECK_INTERVAL_MS",
    );
    this.requestActiveWindowMinutes = this.configService.getOrThrow<number>(
      "PURCHASE_REQUEST_ACTIVE_WINDOW_MINUTES",
    );
  }

  onModuleInit() {
    this.intervalRef = setInterval(() => {
      void this.expireOpenPurchaseRequests();
    }, this.requestExpiryCheckIntervalMs);
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

    return this.purchaseRequestsRepository.transaction(async (tx) => {
      const activeReservationRows =
        await this.purchaseRequestsRepository.findActiveReservationRows(
          userId,
          dto.storeInventoryId,
          new Date(),
          tx,
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

      const existingRequest =
        await this.purchaseRequestsRepository.findLatestActiveRequestForUserStore(
          userId,
          inventory.storeId,
          new Date(),
          tx,
        );

      let requestId = existingRequest?.id;
      const expiresAt = new Date(
        Date.now() + this.requestActiveWindowMinutes * 60 * 1000,
      );

      if (!requestId) {
        const createdRequest =
          await this.purchaseRequestsRepository.createRequest(
            {
              requesterId: userId,
              storeId: inventory.storeId,
              status: "new",
              expiresAt,
            },
            tx,
          );

        requestId = createdRequest.id;
      } else {
        await this.purchaseRequestsRepository.touchRequestExpiry(
          requestId,
          expiresAt,
          tx,
        );
      }

      await this.inventoriesService.reserveStock(inventory.id, dto.qty);

      const item = await this.purchaseRequestsRepository.createItem(
        {
          purchaseRequestId: requestId,
          productId: inventory.productId,
          storeInventoryId: inventory.id,
          qty: dto.qty,
          price: inventory.price,
          total: inventory.price * dto.qty,
        },
        tx,
      );

      await this.purchaseRequestsRepository.recalculateTotal(requestId, tx);

      return item;
    });
  }

  async removeItem(user: AuthenticatedUser, itemId: number) {
    return this.purchaseRequestsRepository.transaction(async (tx) => {
      const item =
        await this.purchaseRequestsRepository.getItemWithRequestForRemoval(
          itemId,
          tx,
        );

      if (!item) {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
      }

      this.assertCanUpdatePurchaseRequest(user, item.requesterId);

      if (item.purchaseRequestStatus !== "new") {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
      }

      const removedItem =
        await this.purchaseRequestsRepository.deleteItemForOpenRequest(
          item.id,
          item.purchaseRequestId,
          item.requesterId,
          tx,
        );

      if (!removedItem) {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
      }

      if (removedItem.storeInventoryId != null) {
        await this.inventoriesService.releaseReservedStock(
          removedItem.storeInventoryId,
          removedItem.qty,
        );
      }

      const remaining =
        await this.purchaseRequestsRepository.countItemsByRequestId(
          item.purchaseRequestId,
          tx,
        );

      if (remaining === 0) {
        await this.purchaseRequestsRepository.setRequestCancelled(
          item.purchaseRequestId,
          tx,
        );
      } else {
        await this.purchaseRequestsRepository.recalculateTotal(
          item.purchaseRequestId,
          tx,
        );
      }

      return { message: "Purchase request item removed" };
    });
  }

  async getActive(userId: number) {
    return (
      (await this.purchaseRequestsRepository.findActiveWithItemsByRequester(
        userId,
      )) ?? null
    );
  }

  async confirm(user: AuthenticatedUser, id: number) {
    return this.purchaseRequestsRepository.transaction(async (tx) => {
      const request = await this.purchaseRequestsRepository.findById(id, tx);

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

      const items = await this.purchaseRequestsRepository.listItemsByRequestId(
        request.id,
        tx,
      );

      if (items.length === 0) {
        throwHttpError(HttpStatus.BAD_REQUEST, "Purchase request has no items");
      }

      const invoiceNumber = `INV-${Date.now()}-${request.id}`;

      const invoice = await this.purchaseRequestsRepository.createInvoice(
        {
          storeId: request.storeId!,
          buyerId: user.id,
          purchaseRequestId: request.id,
          invoiceNumber,
          status: "pending",
          totalAmount: request.totalAmount,
          currency: "IRR",
        },
        tx,
      );

      for (const item of items) {
        await this.purchaseRequestsRepository.createInvoiceItem(
          {
            invoiceId: invoice.id,
            productId: item.productId,
            storeInventoryId: item.storeInventoryId,
            description: null,
            qty: item.qty,
            unitPrice: item.price,
            total: item.total,
          },
          tx,
        );

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

      await this.purchaseRequestsRepository.setRequestConfirmed(request.id, tx);

      return invoice;
    });
  }

  async cancel(user: AuthenticatedUser, id: number) {
    return this.purchaseRequestsRepository.transaction(async (tx) => {
      const request = await this.purchaseRequestsRepository.findById(id, tx);

      if (!request) {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request not found");
      }

      this.assertCanUpdatePurchaseRequest(user, request.requesterId);

      if (request.status !== "new") {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request not found");
      }

      const items = await this.purchaseRequestsRepository.listItemsByRequestId(
        request.id,
        tx,
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

      await this.purchaseRequestsRepository.setRequestCancelled(request.id, tx);

      return { message: "Purchase request cancelled" };
    });
  }

  async expireOpenPurchaseRequests() {
    if (this.isRunningExpiry) {
      return;
    }

    this.isRunningExpiry = true;

    try {
      const expiredRequests =
        await this.purchaseRequestsRepository.findExpiredOpenRequestIds(
          new Date(),
        );

      for (const request of expiredRequests) {
        await this.purchaseRequestsRepository.transaction(async (tx) => {
          const activeRequest =
            await this.purchaseRequestsRepository.findExpiredOpenById(
              request.id,
              new Date(),
              tx,
            );

          if (!activeRequest) {
            return;
          }

          const items =
            await this.purchaseRequestsRepository.listItemsByRequestId(
              activeRequest.id,
              tx,
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

          await this.purchaseRequestsRepository.setRequestExpired(
            activeRequest.id,
            tx,
          );
        });
      }
    } finally {
      this.isRunningExpiry = false;
    }
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
