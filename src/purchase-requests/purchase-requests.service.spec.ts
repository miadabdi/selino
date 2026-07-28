import { HttpException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index";
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
    const service = new PurchaseRequestsService(
      repository as never,
      inventories as never,
      inventoryTransactions as never,
      { createForUser: () => ({ can: () => true }) } as never,
      {
        getOrThrow: (key: string) =>
          key === "PURCHASE_REQUEST_ACTIVE_WINDOW_MINUTES" ? 15 : 60_000,
      } as never,
      tradeNetwork as never,
      { send: jest.fn() } as never,
    );
    const user = {
      id: 10,
      isAdmin: false,
      businessMemberships: [
        {
          id: 1,
          businessAccountId: 100,
          businessName: "Buyer",
          role: "seller",
          permissions: [],
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
    expect(repository.setRequestConfirmed).toHaveBeenCalledWith(50, {});
  });
});

describe("PurchaseRequestsService listing", () => {
  const createService = (repository: object) =>
    new PurchaseRequestsService(
      repository as never,
      {} as never,
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
    permissions: ["seller.purchase-requests.read"],
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
      businessMemberships: [membership],
    } as AuthenticatedUser;

    await expect(
      service.list(user, {
        page: 1,
        limit: 20,
      }),
    ).resolves.toEqual({
      items: [{ id: 1, status: "confirmed" }],
      page: 1,
      limit: 20,
      total: 1,
    });
    expect(repository.listByBuyerBusiness).toHaveBeenCalledWith(100, 1, 20);
  });

  it("rejects a non-admin filter for another business", async () => {
    const repository = { listByBuyerBusiness: jest.fn() };
    const service = createService(repository);
    const user = {
      id: 10,
      isAdmin: false,
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
      error: "Active buyer business membership is required",
    });
    expect(repository.listByBuyerBusiness).not.toHaveBeenCalled();
  });

  it("fails closed when legacy data has multiple active memberships", async () => {
    const repository = { listByBuyerBusiness: jest.fn() };
    const service = createService(repository);
    const user = {
      id: 10,
      isAdmin: false,
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
    );
    expect(repository.listByBuyerBusiness).toHaveBeenNthCalledWith(
      2,
      200,
      2,
      10,
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
    };
    const service = new PurchaseRequestsService(
      repository as never,
      {} as never,
      {} as never,
      { createForUser: () => ({ can: () => true }) } as never,
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
      businessMemberships: [
        {
          id: 1,
          businessAccountId: 100,
          businessName: "Buyer",
          role: "manager",
          permissions: ["seller.purchase-requests.write"],
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
