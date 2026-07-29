import type { AuthenticatedUser } from "../auth/interfaces/index";
import { WalletsService } from "../wallets/wallets.service";
import { OrdersRepository } from "../orders/orders.repository";
import { PaymentsRepository } from "./payments.repository";
import { PaymentsService } from "./payments.service";

const user = {
  id: 10,
  isAdmin: false,
  permissions: [
    "seller.purchase-requests.confirm.own",
    "seller.invoices.active.read.own",
  ],
  businessMemberships: [
    {
      id: 1,
      businessAccountId: 100,
      businessName: "خریدار",
      role: "seller",
      permissions: [
        "seller.purchase-requests.confirm.own",
        "seller.invoices.active.read.own",
        "manager.orders.manage",
      ],
      isActive: true,
    },
  ],
} as AuthenticatedUser;

describe("PaymentsService", () => {
  const tx = {};
  const repository = {
    transaction: jest.fn((callback) => callback(tx)),
    findForBusinessForUpdate: jest.fn(),
    findInvoiceForBuyerForUpdate: jest.fn(),
    markInvoicePaid: jest.fn(),
    markCompleted: jest.fn(),
    addRefund: jest.fn(),
    findInvoiceForBuyer: jest.fn(),
  };
  const wallets = { applyLedgerEntry: jest.fn() };
  const orders = { createFromInvoice: jest.fn() };
  const service = new PaymentsService(
    repository as unknown as PaymentsRepository,
    wallets as unknown as WalletsService,
    orders as unknown as OrdersRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it("completes a wallet payment and invoice in one transaction", async () => {
    repository.findForBusinessForUpdate.mockResolvedValue({
      id: 5,
      invoiceId: 8,
      amount: 100,
      currency: "IRR",
      method: "wallet",
      status: "pending",
    });
    repository.findInvoiceForBuyerForUpdate.mockResolvedValue({
      id: 8,
      invoiceNumber: "1234567890",
      supplierBusinessAccountId: 200,
      buyerBusinessAccountId: 100,
      buyerId: 10,
      purchaseRequestId: 50,
      totalAmount: 100,
      currency: "IRR",
      status: "sent",
    });
    orders.createFromInvoice.mockResolvedValue({ id: 70, invoiceId: 8 });
    wallets.applyLedgerEntry.mockResolvedValue({ idempotent: false });
    repository.markInvoicePaid.mockResolvedValue({ id: 8, status: "paid" });
    repository.markCompleted.mockResolvedValue({ id: 5, status: "succeeded" });

    await expect(service.complete(100, 5, user, {})).resolves.toMatchObject({
      status: "succeeded",
    });
    expect(wallets.applyLedgerEntry).toHaveBeenNthCalledWith(
      1,
      100,
      -100,
      expect.any(Object),
      tx,
      "IRR",
    );
    expect(wallets.applyLedgerEntry).toHaveBeenNthCalledWith(
      2,
      200,
      100,
      expect.any(Object),
      tx,
      "IRR",
    );
    expect(repository.markInvoicePaid).toHaveBeenCalledWith(8, "sent", 10, tx);
    expect(orders.createFromInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ id: 8 }),
      10,
      tx,
    );
  });

  it("requires an opaque provider reference for external completion", async () => {
    repository.findForBusinessForUpdate.mockResolvedValue({
      id: 5,
      invoiceId: 8,
      method: "gateway",
      status: "pending",
    });
    repository.findInvoiceForBuyerForUpdate.mockResolvedValue({
      id: 8,
      buyerId: 10,
      status: "pending",
    });

    await expect(service.complete(100, 5, user, {})).rejects.toMatchObject({
      status: 400,
    });
    expect(wallets.applyLedgerEntry).not.toHaveBeenCalled();
  });

  it("rejects a refund larger than the unrefunded amount", async () => {
    repository.findForBusinessForUpdate.mockResolvedValue({
      id: 5,
      amount: 100,
      refundedAmount: 60,
      status: "partially_refunded",
    });

    await expect(
      service.refund(100, 5, user, {
        amount: 50,
        idempotencyKey: "refund-1",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns succeeded payments idempotently", async () => {
    const payment = { id: 5, invoiceId: 8, status: "succeeded" };
    repository.findForBusinessForUpdate.mockResolvedValue(payment);
    repository.findInvoiceForBuyerForUpdate.mockResolvedValue({
      id: 8,
      buyerId: 10,
      status: "paid",
    });

    await expect(service.complete(100, 5, user, {})).resolves.toBe(payment);
    expect(orders.createFromInvoice).not.toHaveBeenCalled();
  });

  it("denies own-scoped completion for a coworker's invoice", async () => {
    repository.findForBusinessForUpdate.mockResolvedValue({
      id: 5,
      invoiceId: 8,
      method: "wallet",
      status: "pending",
    });
    repository.findInvoiceForBuyerForUpdate.mockResolvedValue({
      id: 8,
      buyerId: 99,
      status: "pending",
    });

    await expect(service.complete(100, 5, user, {})).rejects.toMatchObject({
      status: 403,
    });
    expect(wallets.applyLedgerEntry).not.toHaveBeenCalled();
  });

  it("allows all-scoped completion for a coworker's invoice", async () => {
    const allScopedUser = {
      ...user,
      businessMemberships: [
        {
          ...user.businessMemberships[0],
          permissions: ["seller.purchase-requests.confirm.all"],
        },
      ],
    } as AuthenticatedUser;
    repository.findForBusinessForUpdate.mockResolvedValue({
      id: 5,
      invoiceId: 8,
      amount: 100,
      currency: "IRR",
      method: "wallet",
      status: "pending",
    });
    repository.findInvoiceForBuyerForUpdate.mockResolvedValue({
      id: 8,
      invoiceNumber: "1234567890",
      supplierBusinessAccountId: 200,
      buyerBusinessAccountId: 100,
      buyerId: 99,
      purchaseRequestId: 50,
      totalAmount: 100,
      currency: "IRR",
      status: "pending",
    });
    orders.createFromInvoice.mockResolvedValue({ id: 70, invoiceId: 8 });
    wallets.applyLedgerEntry.mockResolvedValue({ idempotent: false });
    repository.markInvoicePaid.mockResolvedValue({ id: 8, status: "paid" });
    repository.markCompleted.mockResolvedValue({ id: 5, status: "succeeded" });

    await expect(
      service.complete(100, 5, allScopedUser, {}),
    ).resolves.toMatchObject({ status: "succeeded" });
  });
});
