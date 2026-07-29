import type { AuthenticatedUser } from "../auth/interfaces/index";
import { OrdersRepository } from "./orders.repository";
import { OrdersService } from "./orders.service";

const user = {
  id: 10,
  isAdmin: false,
  permissions: ["manager.orders.track", "manager.orders.manage"],
  businessMemberships: [
    {
      id: 1,
      businessAccountId: 100,
      businessName: "فروشگاه نمونه",
      role: "manager",
      permissions: ["manager.orders.track", "manager.orders.manage"],
      isActive: true,
    },
  ],
} as AuthenticatedUser;

describe("OrdersService", () => {
  const tx = {};
  const repository = {
    transaction: jest.fn((callback) => callback(tx)),
    findByInvoiceId: jest.fn(),
    findInvoiceForDerivation: jest.fn(),
    createFromInvoice: jest.fn(),
    findForBusinessForUpdate: jest.fn(),
    updateStatus: jest.fn(),
    findEligibleInvoicesForBusiness: jest.fn(),
    listForBusiness: jest.fn(),
    synchronizeInvoiceForOrder: jest.fn(),
  };
  const service = new OrdersService(repository as unknown as OrdersRepository);

  beforeEach(() => jest.clearAllMocks());

  it("idempotently returns an order already derived from an invoice", async () => {
    const order = { id: 3, invoiceId: 7 };
    repository.findByInvoiceId.mockResolvedValue(order);

    await expect(
      service.deriveFromConfirmedInvoice(100, 7, user),
    ).resolves.toBe(order);
    expect(repository.findInvoiceForDerivation).not.toHaveBeenCalled();
  });

  it("derives an order only from a confirmed purchase invoice", async () => {
    const invoice = {
      id: 7,
      buyerBusinessAccountId: 100,
      supplierBusinessAccountId: 200,
      status: "pending",
      purchaseRequest: { status: "confirmed" },
    };
    repository.findByInvoiceId.mockResolvedValue(null);
    repository.findInvoiceForDerivation.mockResolvedValue(invoice);
    repository.createFromInvoice.mockResolvedValue({ id: 3 });

    await expect(
      service.deriveFromConfirmedInvoice(100, 7, user),
    ).resolves.toEqual({ id: 3 });
    expect(repository.createFromInvoice).toHaveBeenCalledWith(invoice, 10, tx);
  });

  it("rejects an invoice whose purchase request is not confirmed", async () => {
    repository.findByInvoiceId.mockResolvedValue(null);
    repository.findInvoiceForDerivation.mockResolvedValue({
      id: 7,
      buyerBusinessAccountId: 100,
      supplierBusinessAccountId: 200,
      status: "pending",
      purchaseRequest: { status: "new" },
    });

    await expect(
      service.deriveFromConfirmedInvoice(100, 7, user),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("enforces the order transition graph", async () => {
    repository.findForBusinessForUpdate.mockResolvedValue({
      id: 3,
      status: "processing",
    });

    await expect(
      service.updateStatus(100, 3, user, { status: "delivered" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it("records an allowed order transition", async () => {
    repository.findForBusinessForUpdate.mockResolvedValue({
      id: 3,
      status: "ready_to_ship",
    });
    repository.updateStatus.mockResolvedValue({ id: 3, status: "shipped" });

    await expect(
      service.updateStatus(100, 3, user, {
        status: "shipped",
        note: "Carrier collected order",
      }),
    ).resolves.toMatchObject({ status: "shipped" });
    expect(repository.updateStatus).toHaveBeenCalledWith(
      3,
      "ready_to_ship",
      "shipped",
      10,
      "Carrier collected order",
      tx,
    );
  });

  it("requires manage permission for order mutations", async () => {
    const tracker = {
      ...user,
      permissions: ["manager.orders.track"],
      businessMemberships: [
        {
          ...user.businessMemberships[0],
          permissions: ["manager.orders.track"],
        },
      ],
    } as AuthenticatedUser;

    await expect(
      service.updateStatus(100, 3, tracker, { status: "processing" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(repository.findForBusinessForUpdate).not.toHaveBeenCalled();
  });

  it("idempotently reconciles approved invoices before listing orders", async () => {
    const invoice = {
      id: 7,
      buyerBusinessAccountId: 100,
      supplierBusinessAccountId: 200,
      purchaseRequestId: 50,
      totalAmount: 100,
      currency: "IRR",
      purchaseRequest: { status: "confirmed" },
      order: null,
    };
    repository.findEligibleInvoicesForBusiness.mockResolvedValue([invoice]);
    repository.createFromInvoice.mockResolvedValue({
      id: 3,
      invoiceId: 7,
      status: "confirmed",
    });
    repository.listForBusiness.mockResolvedValue({ items: [], total: 0 });

    await service.list(100, user, { page: 1, limit: 20 });

    expect(repository.createFromInvoice).toHaveBeenCalledWith(invoice, 10, tx);
    expect(repository.synchronizeInvoiceForOrder).toHaveBeenCalledWith(
      7,
      "confirmed",
      10,
      "Reconciled from order lifecycle",
      tx,
    );
    expect(repository.listForBusiness).toHaveBeenCalledWith(100, {
      page: 1,
      limit: 20,
    });
  });
});
