import { subject } from "@casl/ability";
import {
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Action, CaslAbilityFactory } from "../auth/casl/index";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { throwHttpError } from "../common/http-error";
import { InventoriesRepository } from "../inventories/inventories.repository";
import { StoreInventoryTransactionsRepository } from "../inventories/store-inventory-transactions.repository";
import { TradeNetworkService } from "../trade-network/trade-network.service";
import type { Invoice } from "../database/schema/index";
import { NotificationService } from "../notification/notification.service";
import { NotificationChannel } from "../notification/notification.enums";
import { AddPurchaseRequestItemDto } from "./dto/add-purchase-request-item.dto";
import type { ListPurchaseRequestsQueryDto } from "./dto/list-purchase-requests-query.dto";
import { PurchaseRequestsRepository } from "./purchase-requests.repository";

@Injectable()
export class PurchaseRequestsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PurchaseRequestsService.name);
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
    private readonly tradeNetworkService: TradeNetworkService,
    private readonly notificationService: NotificationService,
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
      void this.expireOpenPurchaseRequests().catch((error: unknown) => {
        this.logger.error(
          "Failed to expire purchase requests",
          error instanceof Error ? error.stack : String(error),
        );
      });
    }, this.requestExpiryCheckIntervalMs);
  }

  onModuleDestroy() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  private assertPurchaseRequestCasl(
    user: AuthenticatedUser,
    buyerBusinessAccountId: number,
    action: Action,
  ) {
    const ability = this.caslAbilityFactory.createForUser(user);
    const canUpdatePurchaseRequest = ability.can(
      action,
      subject("PurchaseRequest", { buyerBusinessAccountId }),
    );

    if (!canUpdatePurchaseRequest) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "You do not have permission for this action",
      );
    }
  }

  private assertActiveBusinessMembership(
    user: AuthenticatedUser,
    businessAccountId: number,
  ) {
    const membership = user.businessMemberships.find(
      (item) =>
        item.isActive === true && item.businessAccountId === businessAccountId,
    );
    if (!membership && user.isAdmin !== true) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "Active buyer business membership is required",
      );
    }
  }

  private resolveSingleActiveBusinessAccountId(user: AuthenticatedUser) {
    const memberships = user.businessMemberships.filter(
      (item) => item.isActive === true,
    );

    if (memberships.length === 0) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "Active buyer business membership is required",
      );
    }

    if (memberships.length > 1) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "User has multiple active business memberships",
      );
    }

    return memberships[0].businessAccountId;
  }

  async addItem(user: AuthenticatedUser, dto: AddPurchaseRequestItemDto) {
    this.assertActiveBusinessMembership(user, dto.buyerBusinessAccountId);
    this.assertPurchaseRequestCasl(
      user,
      dto.buyerBusinessAccountId,
      Action.Create,
    );

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
        user.id,
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
      await this.purchaseRequestsRepository.findLatestActiveRequestForBuyerBusinessAccount(
        user.id,
        dto.buyerBusinessAccountId,
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
              requesterId: user.id,
              buyerBusinessAccountId: dto.buyerBusinessAccountId,
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

    this.assertActiveBusinessMembership(user, request.buyerBusinessAccountId);
    this.assertPurchaseRequestCasl(
      user,
      request.buyerBusinessAccountId,
      Action.Update,
    );

    if (request.status !== "new") {
      throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
    }

    return this.purchaseRequestsRepository.transaction(async (tx) => {
      const removedItem =
        await this.purchaseRequestsRepository.deleteItemForOpenRequest(
          item.id,
          item.purchaseRequestId,
          request.buyerBusinessAccountId,
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

  async getActive(user: AuthenticatedUser, buyerBusinessAccountId: number) {
    this.assertActiveBusinessMembership(user, buyerBusinessAccountId);
    return (
      (await this.purchaseRequestsRepository.findActiveWithItemsByRequester(
        user.id,
        buyerBusinessAccountId,
      )) ?? null
    );
  }

  list(user: AuthenticatedUser, query: ListPurchaseRequestsQueryDto) {
    if (user.isAdmin === true) {
      return this.purchaseRequestsRepository.listByBuyerBusiness(
        query.buyerBusinessAccountId,
        query.page,
        query.limit,
      );
    }

    const buyerBusinessAccountId =
      this.resolveSingleActiveBusinessAccountId(user);
    if (
      query.buyerBusinessAccountId != null &&
      query.buyerBusinessAccountId !== buyerBusinessAccountId
    ) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "Active buyer business membership is required",
      );
    }

    return this.purchaseRequestsRepository.listByBuyerBusiness(
      buyerBusinessAccountId,
      query.page,
      query.limit,
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

    this.assertActiveBusinessMembership(user, request.buyerBusinessAccountId);
    this.assertPurchaseRequestCasl(
      user,
      request.buyerBusinessAccountId,
      Action.Update,
    );

    if (
      request.status !== "confirmed" &&
      (request.status !== "new" ||
        request.expiresAt == null ||
        request.expiresAt <= new Date())
    ) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "Purchase request is invalid, expired, or already processed",
      );
    }

    const result = await this.purchaseRequestsRepository.transaction(
      async (tx) => {
        const lockedRequest =
          await this.purchaseRequestsRepository.findByIdForUpdate(id, tx);

        if (!lockedRequest) {
          throwHttpError(HttpStatus.NOT_FOUND, "Purchase request not found");
        }

        if (lockedRequest.status === "confirmed") {
          return {
            purchaseRequestId: lockedRequest.id,
            status: lockedRequest.status,
            invoices:
              await this.purchaseRequestsRepository.listInvoicesByPurchaseRequestId(
                lockedRequest.id,
                tx,
              ),
            notifySuppliers: false,
          };
        }

        if (
          lockedRequest.status !== "new" ||
          lockedRequest.expiresAt == null ||
          lockedRequest.expiresAt <= new Date()
        ) {
          throwHttpError(
            HttpStatus.CONFLICT,
            "Purchase request is invalid, expired, or already processed",
          );
        }

        this.assertActiveBusinessMembership(
          user,
          lockedRequest.buyerBusinessAccountId,
        );

        const items =
          await this.purchaseRequestsRepository.listItemsByRequestId(
            lockedRequest.id,
            tx,
          );
        if (items.length === 0) {
          throwHttpError(
            HttpStatus.BAD_REQUEST,
            "Purchase request has no items",
          );
        }

        const groups = new Map<number, typeof items>();
        for (const item of items) {
          if (item.storeInventoryId == null || !item.storeInventory) {
            throwHttpError(HttpStatus.CONFLICT, "Inventory linkage missing");
          }
          const supplierId = item.storeInventory.businessAccountId;
          groups.set(supplierId, [...(groups.get(supplierId) ?? []), item]);
        }

        const createdInvoices: Invoice[] = [];
        for (const [supplierBusinessAccountId, supplierItems] of groups) {
          const supplierTotal = supplierItems.reduce(
            (sum, item) => sum + item.total,
            0,
          );
          const invoice = await this.purchaseRequestsRepository.createInvoice(
            {
              supplierBusinessAccountId,
              buyerBusinessAccountId: lockedRequest.buyerBusinessAccountId,
              buyerId: user.id,
              purchaseRequestId: lockedRequest.id,
              status: "pending",
              totalAmount: supplierTotal,
              currency: "IRR",
            },
            tx,
          );

          for (const item of supplierItems) {
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
          }

          const creditDecision =
            await this.tradeNetworkService.prepareCreditPurchase(
              user,
              lockedRequest.buyerBusinessAccountId,
              supplierBusinessAccountId,
              supplierTotal,
              lockedRequest.id,
              invoice.id,
              tx,
            );

          if (creditDecision.status === "pending_approval") {
            const pendingInvoice =
              await this.purchaseRequestsRepository.setInvoiceStatus(
                invoice.id,
                "pending_credit_approval",
                tx,
              );
            createdInvoices.push(pendingInvoice);
            continue;
          }

          for (const item of supplierItems) {
            const consumed =
              await this.inventoriesRepository.consumeReservedStock(
                item.storeInventoryId!,
                item.qty,
                tx,
              );
            if (consumed.length === 0) {
              throwHttpError(
                HttpStatus.CONFLICT,
                "Insufficient stock for sale",
              );
            }
            await this.storeInventoryTransactionsRepository.create(
              item.storeInventoryId!,
              -item.qty,
              "sale",
              `invoice:${invoice.id}`,
              user.id,
              tx,
            );
          }
          await this.tradeNetworkService.recordCreditPurchase(
            user,
            lockedRequest.buyerBusinessAccountId,
            supplierBusinessAccountId,
            supplierTotal,
            "invoice",
            invoice.id,
            tx,
          );
          createdInvoices.push(invoice);
        }

        await this.purchaseRequestsRepository.setRequestConfirmed(
          lockedRequest.id,
          tx,
        );

        return {
          purchaseRequestId: lockedRequest.id,
          status: "confirmed" as const,
          invoices: createdInvoices,
          notifySuppliers: true,
        };
      },
    );

    if (result.notifySuppliers) {
      await this.notifySupplierInvoiceStates(result.invoices);
    }
    return {
      purchaseRequestId: result.purchaseRequestId,
      status: result.status,
      invoices: result.invoices,
    };
  }

  private async notifySupplierInvoiceStates(invoicesToNotify: Invoice[]) {
    const deliveries: Promise<void>[] = [];
    for (const invoice of invoicesToNotify) {
      const approvalRequired = invoice.status === "pending_credit_approval";
      const recipients =
        await this.purchaseRequestsRepository.listActiveSellerRecipients(
          invoice.supplierBusinessAccountId,
        );
      for (const recipient of recipients) {
        const options = {
          userId: recipient.id,
          type: approvalRequired
            ? "credit_approval_required"
            : "invoice_created",
          title: approvalRequired
            ? "تایید خرید مازاد بر اعتبار"
            : "فاکتور فروش جدید",
          body: approvalRequired
            ? `فاکتور ${invoice.invoiceNumber} به تایید اعتبار شما نیاز دارد.`
            : `فاکتور ${invoice.invoiceNumber} برای شما ایجاد شد.`,
        };
        if (recipient.isPhoneVerified) {
          deliveries.push(
            this.notificationService.send({
              ...options,
              channel: NotificationChannel.SMS,
              destination: recipient.phone,
            }),
          );
        }
        if (recipient.isEmailVerified && recipient.email) {
          deliveries.push(
            this.notificationService.send({
              ...options,
              channel: NotificationChannel.EMAIL,
              destination: recipient.email,
            }),
          );
        }
      }
    }
    const outcomes = await Promise.allSettled(deliveries);
    for (const outcome of outcomes) {
      if (outcome.status === "rejected") {
        this.logger.error(
          "Failed to queue supplier notification",
          outcome.reason instanceof Error
            ? outcome.reason.stack
            : String(outcome.reason),
        );
      }
    }
  }

  async cancel(user: AuthenticatedUser, id: number) {
    const request = await this.purchaseRequestsRepository.findById(id);

    if (!request) {
      throwHttpError(HttpStatus.NOT_FOUND, "Purchase request not found");
    }

    this.assertActiveBusinessMembership(user, request.buyerBusinessAccountId);
    this.assertPurchaseRequestCasl(
      user,
      request.buyerBusinessAccountId,
      Action.Update,
    );

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
