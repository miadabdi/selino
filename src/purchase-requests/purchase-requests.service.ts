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
import { InventoriesRepository } from "../inventories/inventories.repository";
import { StoreInventoryTransactionsRepository } from "../inventories/store-inventory-transactions.repository";
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
    private readonly inventoriesRepository: InventoriesRepository,
    private readonly storeInventoryTransactionsRepository: StoreInventoryTransactionsRepository,
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

  private assertPurchaseRequestCasl(
    user: AuthenticatedUser,
    requesterId: number,
    action: Action,
  ) {
    const ability = this.caslAbilityFactory.createForUser(user);
    const canUpdatePurchaseRequest = ability.can(
      action,
      subject("PurchaseRequest", { requesterId }),
    );

    if (!canUpdatePurchaseRequest) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "You do not have permission for this action",
      );
    }
  }

  async addItem(userId: number, dto: AddPurchaseRequestItemDto) {
    const inventory = await this.inventoriesRepository.findInventoryById(
      dto.storeInventoryId,
    );

    if (!inventory) {
      throwHttpError(
        HttpStatus.NOT_FOUND,
        "Inventory not found",
        "storeInventoryId",
      );
    }

    const activeReservationRows =
      await this.purchaseRequestsRepository.findActiveReservationRows(
        userId,
        dto.storeInventoryId,
        new Date(),
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
      );

    let requestId = existingRequest?.id;
    const expiresAt = new Date(
      Date.now() + this.requestActiveWindowMinutes * 60 * 1000,
    );

    return this.purchaseRequestsRepository.transaction(async (tx) => {
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

      const reserved = await this.inventoriesRepository.reserveStock(
        inventory.id,
        dto.qty,
        tx,
      );

      if (reserved.length === 0) {
        throwHttpError(HttpStatus.CONFLICT, "Out of stock");
      }

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
    const item =
      await this.purchaseRequestsRepository.getItemWithRequestForRemoval(
        itemId,
      );

    if (!item) {
      throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
    }

    const request = item.purchaseRequest;
    if (!request) {
      throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
    }

    this.assertPurchaseRequestCasl(user, request.requesterId, Action.Update);

    if (request.status !== "new") {
      throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
    }

    return this.purchaseRequestsRepository.transaction(async (tx) => {
      const removedItem =
        await this.purchaseRequestsRepository.deleteItemForOpenRequest(
          item.id,
          item.purchaseRequestId,
          request.requesterId,
          tx,
        );

      if (!removedItem) {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
      }

      if (removedItem.storeInventoryId != null) {
        const released = await this.inventoriesRepository.releaseReservedStock(
          removedItem.storeInventoryId,
          removedItem.qty,
          tx,
        );

        if (released.length === 0) {
          throwHttpError(HttpStatus.CONFLICT, "Stock reservation conflict");
        }
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
    const request = await this.purchaseRequestsRepository.findById(id);

    if (!request) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "Purchase request is invalid, expired, or already processed",
      );
    }

    this.assertPurchaseRequestCasl(user, request.requesterId, Action.Update);

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
    );

    if (items.length === 0) {
      throwHttpError(HttpStatus.BAD_REQUEST, "Purchase request has no items");
    }

    return this.purchaseRequestsRepository.transaction(async (tx) => {
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

        const consumed = await this.inventoriesRepository.consumeReservedStock(
          item.storeInventoryId,
          item.qty,
          tx,
        );

        if (consumed.length === 0) {
          throwHttpError(HttpStatus.CONFLICT, "Insufficient stock for sale");
        }

        await this.storeInventoryTransactionsRepository.create(
          item.storeInventoryId,
          -item.qty,
          "sale",
          `invoice:${invoice.id}`,
          user.id,
          tx,
        );
      }

      await this.purchaseRequestsRepository.setRequestConfirmed(request.id, tx);

      return invoice;
    });
  }

  async cancel(user: AuthenticatedUser, id: number) {
    const request = await this.purchaseRequestsRepository.findById(id);

    if (!request) {
      throwHttpError(HttpStatus.NOT_FOUND, "Purchase request not found");
    }

    this.assertPurchaseRequestCasl(user, request.requesterId, Action.Update);

    if (request.status !== "new") {
      throwHttpError(HttpStatus.NOT_FOUND, "Purchase request not found");
    }

    const items = await this.purchaseRequestsRepository.listItemsByRequestId(
      request.id,
    );

    return this.purchaseRequestsRepository.transaction(async (tx) => {
      for (const item of items) {
        if (item.storeInventoryId == null) {
          continue;
        }

        const released = await this.inventoriesRepository.releaseReservedStock(
          item.storeInventoryId,
          item.qty,
          tx,
        );

        if (released.length === 0) {
          throwHttpError(HttpStatus.CONFLICT, "Stock reservation conflict");
        }
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
              true,
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

            const released =
              await this.inventoriesRepository.releaseReservedStock(
                item.storeInventoryId,
                item.qty,
                tx,
              );

            if (released.length === 0) {
              throwHttpError(HttpStatus.CONFLICT, "Stock reservation conflict");
            }
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
}
