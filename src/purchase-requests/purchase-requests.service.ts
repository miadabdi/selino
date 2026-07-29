import {
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import {
  assertBusinessPermission,
  findMembershipWithPermission,
  withIsOwn,
} from "../auth/permissions";
import { throwHttpError } from "../common/http-error";
import { InventoriesRepository } from "../inventories/inventories.repository";
import { StoreInventoryTransactionsRepository } from "../inventories/store-inventory-transactions.repository";
import { TradeNetworkService } from "../trade-network/trade-network.service";
import type { Invoice } from "../database/schema/index";
import { NotificationService } from "../notification/notification.service";
import { NotificationChannel } from "../notification/notification.enums";
import { OrdersRepository } from "../orders/orders.repository";
import { AddPurchaseRequestItemDto } from "./dto/add-purchase-request-item.dto";
import type { ListPurchaseRequestsQueryDto } from "./dto/list-purchase-requests-query.dto";
import type { UpdatePurchaseRequestItemDto } from "./dto/update-purchase-request-item.dto";
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
    private readonly configService: ConfigService,
    private readonly tradeNetworkService: TradeNetworkService,
    private readonly notificationService: NotificationService,
    private readonly ordersRepository: OrdersRepository,
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

  private resolvePurchaseRequestScope(
    user: AuthenticatedUser,
    buyerBusinessAccountId: number,
    requesterId: number,
    ownPermission: string,
    allPermission: string,
  ) {
    if (user.isAdmin === true || user.permissions.includes("*")) {
      return { mode: "all" as const, buyerBusinessAccountId };
    }

    if (
      findMembershipWithPermission(user, allPermission, buyerBusinessAccountId)
    ) {
      return { mode: "all" as const, buyerBusinessAccountId };
    }

    if (
      requesterId === user.id &&
      findMembershipWithPermission(user, ownPermission, buyerBusinessAccountId)
    ) {
      return { mode: "own" as const, buyerBusinessAccountId };
    }

    throwHttpError(
      HttpStatus.FORBIDDEN,
      "You do not have permission for this action",
    );
  }

  private resolveListScope(
    user: AuthenticatedUser,
    requestedBusinessAccountId?: number,
  ) {
    if (user.isAdmin === true || user.permissions.includes("*")) {
      return {
        buyerBusinessAccountId: requestedBusinessAccountId,
        requesterId: undefined,
      };
    }

    const matchingMemberships = user.businessMemberships.filter(
      (membership) =>
        membership.isActive &&
        (requestedBusinessAccountId == null ||
          membership.businessAccountId === requestedBusinessAccountId),
    );
    const allMemberships = matchingMemberships.filter((membership) =>
      membership.permissions.includes("seller.purchase-requests.read.all"),
    );
    if (requestedBusinessAccountId == null && allMemberships.length > 1) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "User has multiple active business memberships",
      );
    }
    if (allMemberships[0]) {
      return {
        buyerBusinessAccountId: allMemberships[0].businessAccountId,
        requesterId: undefined,
      };
    }

    const ownMemberships = matchingMemberships.filter((membership) =>
      membership.permissions.includes("seller.purchase-requests.read.own"),
    );
    if (requestedBusinessAccountId == null && ownMemberships.length > 1) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "User has multiple active business memberships",
      );
    }
    if (ownMemberships[0]) {
      return {
        buyerBusinessAccountId: ownMemberships[0].businessAccountId,
        requesterId: user.id,
      };
    }

    throwHttpError(
      HttpStatus.FORBIDDEN,
      "You do not have permission for this action",
    );
  }

  async addItem(user: AuthenticatedUser, dto: AddPurchaseRequestItemDto) {
    assertBusinessPermission(
      user,
      dto.buyerBusinessAccountId,
      "seller.purchase-requests.create",
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

    if (dto.buyerBusinessAccountId === inventory.businessAccountId) {
      throwHttpError(
        HttpStatus.BAD_REQUEST,
        "Cannot add inventory from the active buyer business account",
        "storeInventoryId",
      );
    }

    if (inventory.isActive !== true || inventory.visible !== true) {
      throwHttpError(HttpStatus.NOT_FOUND, "Inventory not found");
    }

    if (inventory.minOrderQty != null && dto.qty < inventory.minOrderQty) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "Quantity is below min_order_qty",
        "qty",
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

    this.resolvePurchaseRequestScope(
      user,
      request.buyerBusinessAccountId,
      request.requesterId,
      "seller.purchase-requests.cancel.own",
      "seller.purchase-requests.cancel.all",
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
        await this.purchaseRequestsRepository.recordStatusEvent(
          item.purchaseRequestId,
          "new",
          "cancelled",
          user.id,
          "All request items were removed",
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

  async updateItem(
    user: AuthenticatedUser,
    itemId: number,
    dto: UpdatePurchaseRequestItemDto,
  ) {
    return this.purchaseRequestsRepository.transaction(async (tx) => {
      const item =
        await this.purchaseRequestsRepository.findItemWithRequestForUpdate(
          itemId,
          tx,
        );

      if (!item) {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
      }

      const request = item.purchaseRequest;
      this.resolvePurchaseRequestScope(
        user,
        request.buyerBusinessAccountId,
        request.requesterId,
        "seller.purchase-requests.cancel.own",
        "seller.purchase-requests.cancel.all",
      );

      if (
        request.status !== "new" ||
        request.expiresAt == null ||
        request.expiresAt <= new Date()
      ) {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request item not found");
      }

      if (item.storeInventoryId == null) {
        throwHttpError(HttpStatus.CONFLICT, "Inventory linkage missing");
      }

      const inventory = await this.inventoriesRepository.findInventoryById(
        item.storeInventoryId,
        tx,
      );
      if (!inventory) {
        throwHttpError(HttpStatus.CONFLICT, "Inventory linkage missing");
      }

      if (dto.qty < inventory.minOrderQty) {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Quantity is below min_order_qty",
          "qty",
        );
      }

      const activeReservationRows =
        await this.purchaseRequestsRepository.findActiveReservationRows(
          request.requesterId,
          item.storeInventoryId,
          new Date(),
          tx,
        );
      const existingQty = activeReservationRows.reduce(
        (sum, row) => sum + row.qty,
        0,
      );
      if (
        inventory.maxOrderQty != null &&
        existingQty - item.qty + dto.qty > inventory.maxOrderQty
      ) {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Quantity exceeds max_order_qty",
          "qty",
        );
      }

      const delta = dto.qty - item.qty;
      if (delta > 0) {
        const reserved = await this.inventoriesRepository.reserveStock(
          item.storeInventoryId,
          delta,
          tx,
        );
        if (reserved.length === 0) {
          throwHttpError(HttpStatus.CONFLICT, "Out of stock");
        }
      } else if (delta < 0) {
        const released = await this.inventoriesRepository.releaseReservedStock(
          item.storeInventoryId,
          -delta,
          tx,
        );
        if (released.length === 0) {
          throwHttpError(HttpStatus.CONFLICT, "Stock reservation conflict");
        }
      }

      const updated =
        await this.purchaseRequestsRepository.updateItemQuantityForOpenRequest(
          item.id,
          item.purchaseRequestId,
          dto.qty,
          item.price,
          tx,
        );
      if (!updated) {
        throwHttpError(HttpStatus.CONFLICT, "Purchase request changed");
      }

      await this.purchaseRequestsRepository.recalculateTotal(
        item.purchaseRequestId,
        tx,
      );

      return updated;
    });
  }

  async getActive(user: AuthenticatedUser, buyerBusinessAccountId: number) {
    this.resolvePurchaseRequestScope(
      user,
      buyerBusinessAccountId,
      user.id,
      "seller.purchase-requests.read.own",
      "seller.purchase-requests.read.all",
    );
    const active =
      await this.purchaseRequestsRepository.findActiveWithItemsByRequester(
        user.id,
        buyerBusinessAccountId,
      );

    return active ? withIsOwn(active, user.id) : null;
  }

  async list(user: AuthenticatedUser, query: ListPurchaseRequestsQueryDto) {
    const scope = this.resolveListScope(user, query.buyerBusinessAccountId);
    const hasFilters =
      query.status != null ||
      query.statusGroup != null ||
      query.search != null ||
      query.from != null ||
      query.to != null;
    const result = hasFilters
      ? await this.purchaseRequestsRepository.listByBuyerBusiness(
          scope.buyerBusinessAccountId,
          query.page,
          query.limit,
          scope.requesterId,
          {
            status: query.status,
            statuses: getPurchaseRequestGroupStatuses(query.statusGroup),
            search: query.search,
            from: query.from,
            to: query.to,
          },
        )
      : await this.purchaseRequestsRepository.listByBuyerBusiness(
          scope.buyerBusinessAccountId,
          query.page,
          query.limit,
          scope.requesterId,
        );

    return {
      ...result,
      items: result.items.map((item) => withIsOwn(item, user.id)),
    };
  }

  async get(user: AuthenticatedUser, id: number) {
    const request = await this.purchaseRequestsRepository.findDetailedById(id);
    if (!request) {
      throwHttpError(HttpStatus.NOT_FOUND, "Purchase request not found");
    }
    this.resolvePurchaseRequestScope(
      user,
      request.buyerBusinessAccountId,
      request.requesterId,
      "seller.purchase-requests.read.own",
      "seller.purchase-requests.read.all",
    );
    return withIsOwn(request, user.id);
  }

  async confirm(user: AuthenticatedUser, id: number) {
    const request = await this.purchaseRequestsRepository.findById(id);

    if (!request) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "Purchase request is invalid, expired, or already processed",
      );
    }

    this.resolvePurchaseRequestScope(
      user,
      request.buyerBusinessAccountId,
      request.requesterId,
      "seller.purchase-requests.confirm.own",
      "seller.purchase-requests.confirm.all",
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
          const invoices =
            await this.purchaseRequestsRepository.listInvoicesByPurchaseRequestId(
              lockedRequest.id,
              tx,
            );
          for (const invoice of invoices) {
            if (
              ["pending", "sent", "delivered", "paid"].includes(invoice.status)
            ) {
              await this.ordersRepository.createFromInvoice(
                invoice,
                user.id,
                tx,
              );
            }
          }
          return {
            purchaseRequestId: lockedRequest.id,
            status: lockedRequest.status,
            invoices,
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

        this.resolvePurchaseRequestScope(
          user,
          lockedRequest.buyerBusinessAccountId,
          lockedRequest.requesterId,
          "seller.purchase-requests.confirm.own",
          "seller.purchase-requests.confirm.all",
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
          const order = await this.ordersRepository.createFromInvoice(
            invoice,
            user.id,
            tx,
          );
          if (!order) {
            throwHttpError(HttpStatus.CONFLICT, "Order could not be created");
          }
          createdInvoices.push(invoice);
        }

        await this.purchaseRequestsRepository.setRequestConfirmed(
          lockedRequest.id,
          tx,
        );
        await this.purchaseRequestsRepository.recordStatusEvent(
          lockedRequest.id,
          lockedRequest.status,
          "confirmed",
          user.id,
          null,
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

    this.resolvePurchaseRequestScope(
      user,
      request.buyerBusinessAccountId,
      request.requesterId,
      "seller.purchase-requests.cancel.own",
      "seller.purchase-requests.cancel.all",
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
      await this.purchaseRequestsRepository.recordStatusEvent(
        request.id,
        request.status,
        "cancelled",
        user.id,
        null,
        tx,
      );

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
          await this.purchaseRequestsRepository.recordStatusEvent(
            activeRequest.id,
            "new",
            "expired",
            null,
            "Request expired",
            tx,
          );
        });
      }
    } finally {
      this.isRunningExpiry = false;
    }
  }
}

function getPurchaseRequestGroupStatuses(
  group: ListPurchaseRequestsQueryDto["statusGroup"],
) {
  if (group === "new") return ["new"] as const;
  if (group === "under_review") {
    return ["pending_credit_approval"] as const;
  }
  if (group === "completed") {
    return ["confirmed", "cancelled", "expired"] as const;
  }
  return undefined;
}
