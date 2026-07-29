import { HttpException } from "@nestjs/common";
import { validate } from "class-validator";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { UpdatePurchaseRequestItemDto } from "./dto/update-purchase-request-item.dto";
import { PurchaseRequestsService } from "./purchase-requests.service";

describe("PurchaseRequestsService confirmation", () => {
  it("fans one request out by supplier and keeps only over-limit stock reserved", async () => {
    const now = new Date();
    const request = {
      id: 50,
      requesterId: 10,
      buyerBusinessAccountId: 100,
      status: "new" as const,
      expiresAt: new Date(now.getTime() + 60_000),
      totalAmount: 300,
    };
    const items = [
      {
        id: 1,
        productId: 11,
        storeInventoryId: 21,
        qty: 1,
        price: 100,
        total: 100,
        storeInventory: { id: 21, businessAccountId: 200 },
      },
      {
        id: 2,
        productId: 12,
        storeInventoryId: 22,
        qty: 1,
        price: 200,
        total: 200,
        storeInventory: { id: 22, businessAccountId: 300 },
      },
    ];
    const invoices = [
      {
        id: 1,
        supplierBusinessAccountId: 200,
        buyerBusinessAccountId: 100,
        buyerId: 10,
        purchaseRequestId: 50,
        invoiceNumber: "3654435759",
        status: "pending" as const,
        totalAmount: 100,
        currency: "IRR",
        createdAt: now,
        updatedAt: now,
        paidAt: null,
        dueAt: null,
        meta: null,
      },
      {
        id: 2,
        supplierBusinessAccountId: 300,
        buyerBusinessAccountId: 100,
        buyerId: 10,
        purchaseRequestId: 50,
        invoiceNumber: "6308871518",
        status: "pending" as const,
        totalAmount: 200,
        currency: "IRR",
        createdAt: now,
        updatedAt: now,
        paidAt: null,
        dueAt: null,
        meta: null,
      },
    ];
    const repository = {
      findById: jest.fn().mockResolvedValue(request),
      transaction: jest.fn((callback: (tx: object) => unknown) => callback({})),
      findByIdForUpdate: jest.fn().mockResolvedValue(request),
      listItemsByRequestId: jest.fn().mockResolvedValue(items),
      createInvoice: jest
        .fn()
        .mockResolvedValueOnce(invoices[0])
        .mockResolvedValueOnce(invoices[1]),
      createInvoiceItem: jest.fn(),
      setInvoiceStatus: jest.fn().mockResolvedValue({
        ...invoices[1],
        status: "pending_credit_approval",
      }),
      setRequestConfirmed: jest.fn(),
      listActiveSellerRecipients: jest.fn().mockResolvedValue([]),
      recordStatusEvent: jest.fn(),
    };
    const inventories = {
      consumeReservedStock: jest.fn().mockResolvedValue([{ id: 21 }]),
    };
    const inventoryTransactions = { create: jest.fn() };
    const tradeNetwork = {
      prepareCreditPurchase: jest
        .fn()
        .mockResolvedValueOnce({ status: "approved_without_agreement" })
        .mockResolvedValueOnce({
          status: "pending_approval",
          approvalRequest: { id: 1 },
        }),
      recordCreditPurchase: jest.fn(),
    };
    const orders = {
      createFromInvoice: jest.fn().mockResolvedValue({ id: 91 }),
    };
    const service = new PurchaseRequestsService(
      repository as never,
      inventories as never,
      inventoryTransactions as never,
      {
        getOrThrow: (key: string) =>
          key === "PURCHASE_REQUEST_ACTIVE_WINDOW_MINUTES" ? 15 : 60_000,
      } as never,
      tradeNetwork as never,
      { send: jest.fn() } as never,
      orders as never,
    );
    const user = {
      id: 10,
      isAdmin: false,
      permissions: ["seller.purchase-requests.confirm.own"],
      businessMemberships: [
        {
          id: 1,
          businessAccountId: 100,
          businessName: "Buyer",
          role: "seller",
          permissions: ["seller.purchase-requests.confirm.own"],
          isActive: true,
        },
      ],
    } as AuthenticatedUser;

    const result = await service.confirm(user, 50);

    expect(result.invoices).toHaveLength(2);
    expect(repository.createInvoice).toHaveBeenCalledTimes(2);
    expect(repository.createInvoice.mock.calls[0][0]).not.toHaveProperty(
      "invoiceNumber",
    );
    expect(repository.createInvoice.mock.calls[1][0]).not.toHaveProperty(
      "invoiceNumber",
    );
    expect(inventories.consumeReservedStock).toHaveBeenCalledTimes(1);
    expect(inventories.consumeReservedStock).toHaveBeenCalledWith(21, 1, {});
    expect(repository.setInvoiceStatus).toHaveBeenCalledWith(
      2,
      "pending_credit_approval",
      {},
    );
    expect(orders.createFromInvoice).toHaveBeenCalledTimes(1);
    expect(orders.createFromInvoice).toHaveBeenCalledWith(invoices[0], 10, {});
    expect(repository.setRequestConfirmed).toHaveBeenCalledWith(50, {});
  });

  it("idempotently creates an order after credit approval activates an invoice", async () => {
    const request = {
      id: 50,
      requesterId: 10,
      buyerBusinessAccountId: 100,
      status: "confirmed" as const,
      expiresAt: new Date(),
    };
    const invoices = [
      {
        id: 1,
        buyerBusinessAccountId: 100,
        supplierBusinessAccountId: 200,
        buyerId: 10,
        purchaseRequestId: 50,
        status: "pending" as const,
        totalAmount: 100,
        currency: "IRR",
      },
      {
        id: 2,
        buyerBusinessAccountId: 100,
        supplierBusinessAccountId: 300,
        buyerId: 10,
        purchaseRequestId: 50,
        status: "pending_credit_approval" as const,
        totalAmount: 200,
        currency: "IRR",
      },
    ];
    const repository = {
      findById: jest.fn().mockResolvedValue(request),
      transaction: jest.fn((callback: (tx: object) => unknown) => callback({})),
      findByIdForUpdate: jest.fn().mockResolvedValue(request),
      listInvoicesByPurchaseRequestId: jest.fn().mockResolvedValue(invoices),
    };
    const orders = {
      createFromInvoice: jest.fn().mockResolvedValue({ id: 91 }),
    };
    const service = new PurchaseRequestsService(
      repository as never,
      {} as never,
      {} as never,
      {
        getOrThrow: (key: string) =>
          key === "PURCHASE_REQUEST_ACTIVE_WINDOW_MINUTES" ? 15 : 60_000,
      } as never,
      {} as never,
      {} as never,
      orders as never,
    );
    const user = {
      id: 10,
      isAdmin: false,
      permissions: ["seller.purchase-requests.confirm.own"],
      businessMemberships: [
        {
          id: 1,
          businessAccountId: 100,
          businessName: "Buyer",
          role: "seller",
          permissions: ["seller.purchase-requests.confirm.own"],
          isActive: true,
        },
      ],
    } as AuthenticatedUser;

    await expect(service.confirm(user, 50)).resolves.toMatchObject({
      status: "confirmed",
      invoices,
    });
    expect(orders.createFromInvoice).toHaveBeenCalledTimes(1);
    expect(orders.createFromInvoice).toHaveBeenCalledWith(invoices[0], 10, {});
  });
});

describe("PurchaseRequestsService listing", () => {
  const createService = (repository: object) =>
    new PurchaseRequestsService(
      repository as never,
      {} as never,
      {} as never,
      {
        getOrThrow: (key: string) =>
          key === "PURCHASE_REQUEST_ACTIVE_WINDOW_MINUTES" ? 15 : 60_000,
      } as never,
      {} as never,
      {} as never,
    );

  const membership = {
    id: 1,
    businessAccountId: 100,
    businessName: "Buyer",
    role: "seller",
    permissions: ["seller.purchase-requests.read.all"],
    isActive: true,
  };

  it("lists store-wide requests without requiring a buyer filter", async () => {
    const repository = {
      listByBuyerBusiness: jest.fn().mockResolvedValue({
        items: [{ id: 1, status: "confirmed" }],
        page: 1,
        limit: 20,
        total: 1,
      }),
    };
    const service = createService(repository);
    const user = {
      id: 10,
      isAdmin: false,
      permissions: ["seller.purchase-requests.read.all"],
      businessMemberships: [membership],
    } as AuthenticatedUser;

    await expect(
      service.list(user, {
        page: 1,
        limit: 20,
      }),
    ).resolves.toEqual({
      items: [{ id: 1, status: "confirmed", isOwn: false }],
      page: 1,
      limit: 20,
      total: 1,
    });
    expect(repository.listByBuyerBusiness).toHaveBeenCalledWith(
      100,
      1,
      20,
      undefined,
    );
  });

  it("maps the completed dashboard tab to every terminal request status", async () => {
    const repository = {
      listByBuyerBusiness: jest.fn().mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      }),
    };
    const service = createService(repository);
    const user = {
      id: 10,
      isAdmin: false,
      permissions: ["seller.purchase-requests.read.all"],
      businessMemberships: [membership],
    } as AuthenticatedUser;

    await service.list(user, {
      statusGroup: "completed",
      page: 1,
      limit: 20,
    });

    expect(repository.listByBuyerBusiness).toHaveBeenCalledWith(
      100,
      1,
      20,
      undefined,
      {
        status: undefined,
        statuses: ["confirmed", "cancelled", "expired"],
        search: undefined,
        from: undefined,
        to: undefined,
      },
    );
  });

  it("rejects a non-admin filter for another business", async () => {
    const repository = { listByBuyerBusiness: jest.fn() };
    const service = createService(repository);
    const user = {
      id: 10,
      isAdmin: false,
      permissions: ["seller.purchase-requests.read.all"],
      businessMemberships: [membership],
    } as AuthenticatedUser;

    let thrown: HttpException | undefined;
    try {
      await service.list(user, {
        buyerBusinessAccountId: 200,
        page: 1,
        limit: 20,
      });
    } catch (error) {
      thrown = error as HttpException;
    }

    expect(thrown?.getResponse()).toEqual({
      error: "You do not have permission for this action",
    });
    expect(repository.listByBuyerBusiness).not.toHaveBeenCalled();
  });

  it("fails closed when legacy data has multiple active memberships", async () => {
    const repository = { listByBuyerBusiness: jest.fn() };
    const service = createService(repository);
    const user = {
      id: 10,
      isAdmin: false,
      permissions: ["seller.purchase-requests.read.all"],
      businessMemberships: [
        membership,
        { ...membership, id: 2, businessAccountId: 200 },
      ],
    } as AuthenticatedUser;

    let thrown: HttpException | undefined;
    try {
      await service.list(user, {
        page: 1,
        limit: 20,
      });
    } catch (error) {
      thrown = error as HttpException;
    }

    expect(thrown?.getResponse()).toEqual({
      error: "User has multiple active business memberships",
    });
    expect(repository.listByBuyerBusiness).not.toHaveBeenCalled();
  });

  it("allows an admin to list globally or filter by business", async () => {
    const repository = {
      listByBuyerBusiness: jest.fn().mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      }),
    };
    const service = createService(repository);
    const admin = {
      id: 1,
      isAdmin: true,
      permissions: [],
      businessMemberships: [],
    } as AuthenticatedUser;

    await service.list(admin, { page: 1, limit: 20 });
    await service.list(admin, {
      buyerBusinessAccountId: 200,
      page: 2,
      limit: 10,
    });

    expect(repository.listByBuyerBusiness).toHaveBeenNthCalledWith(
      1,
      undefined,
      1,
      20,
      undefined,
    );
    expect(repository.listByBuyerBusiness).toHaveBeenNthCalledWith(
      2,
      200,
      2,
      10,
      undefined,
    );
  });
});

describe("PurchaseRequestsService store-scoped mutations", () => {
  it("allows a manager to cancel a coworker's open request in the same business", async () => {
    const request = {
      id: 50,
      requesterId: 99,
      buyerBusinessAccountId: 100,
      status: "new" as const,
    };
    const repository = {
      findById: jest.fn().mockResolvedValue(request),
      listItemsByRequestId: jest.fn().mockResolvedValue([]),
      transaction: jest.fn((callback: (tx: object) => unknown) => callback({})),
      setRequestCancelled: jest.fn(),
      recordStatusEvent: jest.fn(),
    };
    const service = new PurchaseRequestsService(
      repository as never,
      {} as never,
      {} as never,
      {
        getOrThrow: (key: string) =>
          key === "PURCHASE_REQUEST_ACTIVE_WINDOW_MINUTES" ? 15 : 60_000,
      } as never,
      {} as never,
      {} as never,
    );
    const manager = {
      id: 10,
      isAdmin: false,
      permissions: ["seller.purchase-requests.cancel.all"],
      businessMemberships: [
        {
          id: 1,
          businessAccountId: 100,
          businessName: "Buyer",
          role: "manager",
          permissions: ["seller.purchase-requests.cancel.all"],
          isActive: true,
        },
      ],
    } as AuthenticatedUser;

    await expect(service.cancel(manager, request.id)).resolves.toEqual({
      message: "Purchase request cancelled",
    });
    expect(repository.setRequestCancelled).toHaveBeenCalledWith(50, {});
  });
});

describe("PurchaseRequestsService quantity updates", () => {
  const tx = { id: "tx" };
  const user = {
    id: 10,
    isAdmin: false,
    permissions: ["seller.purchase-requests.cancel.own"],
    businessMemberships: [
      {
        id: 1,
        businessAccountId: 100,
        businessName: "Buyer",
        role: "seller",
        permissions: ["seller.purchase-requests.cancel.own"],
        isActive: true,
      },
    ],
  } as AuthenticatedUser;

  const makeOpenItem = (qty = 2) => ({
    id: 7,
    qty,
    price: 125,
    storeInventoryId: 21,
    purchaseRequestId: 50,
    purchaseRequest: {
      requesterId: 10,
      buyerBusinessAccountId: 100,
      status: "new" as const,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  const createService = ({
    item = makeOpenItem(),
    inventory = { id: 21, minOrderQty: 1, maxOrderQty: 10 },
    activeRows = [{ qty: item.qty }],
    reserveResult = [{ id: 21 }],
    releaseResult = [{ id: 21 }],
  } = {}) => {
    const repository = {
      transaction: jest.fn((callback: (context: object) => unknown) =>
        callback(tx),
      ),
      findItemWithRequestForUpdate: jest.fn().mockResolvedValue(item),
      findActiveReservationRows: jest.fn().mockResolvedValue(activeRows),
      updateItemQuantityForOpenRequest: jest
        .fn()
        .mockImplementation(
          (
            id: number,
            purchaseRequestId: number,
            qty: number,
            price: number,
          ) => ({
            id,
            purchaseRequestId,
            qty,
            price,
            total: price * qty,
          }),
        ),
      recalculateTotal: jest.fn(),
    };
    const inventories = {
      findInventoryById: jest.fn().mockResolvedValue(inventory),
      reserveStock: jest.fn().mockResolvedValue(reserveResult),
      releaseReservedStock: jest.fn().mockResolvedValue(releaseResult),
    };
    const service = new PurchaseRequestsService(
      repository as never,
      inventories as never,
      {} as never,
      {
        getOrThrow: (key: string) =>
          key === "PURCHASE_REQUEST_ACTIVE_WINDOW_MINUTES" ? 15 : 60_000,
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { inventories, repository, service };
  };

  it("validates the quantity DTO as a positive integer", async () => {
    const zero = Object.assign(new UpdatePurchaseRequestItemDto(), { qty: 0 });
    const fraction = Object.assign(new UpdatePurchaseRequestItemDto(), {
      qty: 1.5,
    });
    const valid = Object.assign(new UpdatePurchaseRequestItemDto(), { qty: 3 });

    await expect(validate(zero)).resolves.not.toHaveLength(0);
    await expect(validate(fraction)).resolves.not.toHaveLength(0);
    await expect(validate(valid)).resolves.toHaveLength(0);
  });

  it("atomically reserves only the increase and recalculates totals", async () => {
    const { inventories, repository, service } = createService();

    await expect(
      service.updateItem(user, 7, { qty: 5 }),
    ).resolves.toMatchObject({
      id: 7,
      qty: 5,
      total: 625,
    });

    expect(repository.findItemWithRequestForUpdate).toHaveBeenCalledWith(7, tx);
    expect(inventories.findInventoryById).toHaveBeenCalledWith(21, tx);
    expect(inventories.reserveStock).toHaveBeenCalledWith(21, 3, tx);
    expect(inventories.releaseReservedStock).not.toHaveBeenCalled();
    expect(repository.updateItemQuantityForOpenRequest).toHaveBeenCalledWith(
      7,
      50,
      5,
      125,
      tx,
    );
    expect(repository.recalculateTotal).toHaveBeenCalledWith(50, tx);
  });

  it("atomically releases only the decrease", async () => {
    const { inventories, repository, service } = createService({
      item: makeOpenItem(5),
      activeRows: [{ qty: 5 }],
    });

    await service.updateItem(user, 7, { qty: 2 });

    expect(inventories.releaseReservedStock).toHaveBeenCalledWith(21, 3, tx);
    expect(inventories.reserveStock).not.toHaveBeenCalled();
    expect(repository.updateItemQuantityForOpenRequest).toHaveBeenCalledWith(
      7,
      50,
      2,
      125,
      tx,
    );
  });

  it("rejects quantities below the inventory minimum", async () => {
    const { inventories, repository, service } = createService({
      inventory: { id: 21, minOrderQty: 3, maxOrderQty: 10 },
    });

    await expect(service.updateItem(user, 7, { qty: 2 })).rejects.toMatchObject(
      {
        status: 409,
      },
    );
    expect(inventories.reserveStock).not.toHaveBeenCalled();
    expect(repository.updateItemQuantityForOpenRequest).not.toHaveBeenCalled();
  });

  it("counts all active reservations when enforcing the inventory maximum", async () => {
    const { inventories, repository, service } = createService({
      inventory: { id: 21, minOrderQty: 1, maxOrderQty: 6 },
      activeRows: [{ qty: 2 }, { qty: 3 }],
    });

    await expect(service.updateItem(user, 7, { qty: 4 })).rejects.toMatchObject(
      {
        status: 409,
      },
    );
    expect(inventories.reserveStock).not.toHaveBeenCalled();
    expect(repository.updateItemQuantityForOpenRequest).not.toHaveBeenCalled();
  });

  it("does not update the item when additional stock cannot be reserved", async () => {
    const { repository, service } = createService({ reserveResult: [] });

    await expect(service.updateItem(user, 7, { qty: 5 })).rejects.toMatchObject(
      {
        status: 409,
      },
    );
    expect(repository.updateItemQuantityForOpenRequest).not.toHaveBeenCalled();
    expect(repository.recalculateTotal).not.toHaveBeenCalled();
  });

  it("rejects an expired request item before changing stock", async () => {
    const expired = makeOpenItem();
    expired.purchaseRequest.expiresAt = new Date(Date.now() - 60_000);
    const { inventories, repository, service } = createService({
      item: expired,
    });

    await expect(service.updateItem(user, 7, { qty: 3 })).rejects.toMatchObject(
      {
        status: 404,
      },
    );
    expect(inventories.findInventoryById).not.toHaveBeenCalled();
    expect(repository.updateItemQuantityForOpenRequest).not.toHaveBeenCalled();
  });
});
