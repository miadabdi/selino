import type { AuthenticatedUser } from "../auth/interfaces/index";
import { InvoiceExportService } from "./invoice-export.service";
import { InvoicesRepository } from "./invoices.repository";
import { InvoicesService } from "./invoices.service";
import { OrdersRepository } from "../orders/orders.repository";

function makeUser(permissions: string[]): AuthenticatedUser {
  return {
    id: 1,
    isAdmin: false,
    permissions,
    businessMemberships: [
      {
        id: 10,
        businessAccountId: 20,
        businessName: "فروشگاه نمونه",
        role: "seller",
        permissions,
        isActive: true,
      },
    ],
  } as AuthenticatedUser;
}

function makeInvoice(status: string) {
  return {
    id: 30,
    buyerBusinessAccountId: 20,
    supplierBusinessAccountId: 40,
    buyerId: 1,
    status,
    items: [],
  };
}

describe("InvoicesService", () => {
  const repository = {
    findForBusiness: jest.fn(),
    findManyForExport: jest.fn(),
    transaction: jest.fn((callback: (tx: object) => unknown) => callback({})),
    transitionStatus: jest.fn(),
  };
  const invoiceExportService = {
    createWorkbook: jest.fn(),
  };
  const ordersRepository = {
    createFromInvoice: jest.fn(),
    synchronizeOrderForInvoiceStatus: jest.fn(),
  };
  const service = new InvoicesService(
    repository as unknown as InvoicesRepository,
    invoiceExportService as unknown as InvoiceExportService,
    ordersRepository as unknown as OrdersRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires history permission when opening a completed invoice", async () => {
    repository.findForBusiness.mockResolvedValue(makeInvoice("paid"));

    await expect(
      service.get(makeUser(["seller.invoices.active.read.own"]), 20, 30),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("allows active invoice detail with active permission", async () => {
    const invoice = makeInvoice("sent");
    repository.findForBusiness.mockResolvedValue(invoice);

    await expect(
      service.get(makeUser(["seller.invoices.active.read.own"]), 20, 30),
    ).resolves.toBe(invoice);
  });

  it("exports exactly the invoices selected by the user", async () => {
    const invoices = [makeInvoice("sent"), { ...makeInvoice("sent"), id: 31 }];
    repository.findManyForExport.mockResolvedValue(invoices);
    invoiceExportService.createWorkbook.mockResolvedValue(Buffer.from("xlsx"));

    const result = await service.export(
      makeUser(["seller.invoices.active.read.own"]),
      20,
      {
        direction: "purchase",
        view: "active",
        invoiceIds: [30, 31],
      },
    );

    expect(repository.findManyForExport).toHaveBeenCalledWith(
      20,
      {
        direction: "purchase",
        view: "active",
        invoiceIds: [30, 31],
      },
      1,
    );
    expect(invoiceExportService.createWorkbook).toHaveBeenCalledWith(invoices);
    expect(result.buffer).toEqual(Buffer.from("xlsx"));
    expect(result.filename).toMatch(
      /^invoices-purchase-active-\d{4}-\d{2}-\d{2}\.xlsx$/,
    );
  });

  it("fails the export when any selected invoice is unavailable", async () => {
    repository.findManyForExport.mockResolvedValue([makeInvoice("sent")]);

    await expect(
      service.export(makeUser(["seller.invoices.active.read.own"]), 20, {
        direction: "purchase",
        view: "active",
        invoiceIds: [30, 31],
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(invoiceExportService.createWorkbook).not.toHaveBeenCalled();
  });

  it("denies an own-scoped user access to a coworker's invoice", async () => {
    repository.findForBusiness.mockResolvedValue({
      ...makeInvoice("sent"),
      buyerId: 99,
    });

    await expect(
      service.get(makeUser(["seller.invoices.active.read.own"]), 20, 30),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("allows an all-scoped user to access a coworker's invoice", async () => {
    const invoice = { ...makeInvoice("sent"), buyerId: 99 };
    repository.findForBusiness.mockResolvedValue(invoice);

    await expect(
      service.get(makeUser(["seller.invoices.active.read.all"]), 20, 30),
    ).resolves.toBe(invoice);
  });

  it("synchronizes the order before advancing an invoice", async () => {
    const invoice = {
      ...makeInvoice("pending"),
      order: { id: 70, status: "ready_to_ship" },
    };
    repository.findForBusiness.mockResolvedValue(invoice);
    ordersRepository.synchronizeOrderForInvoiceStatus.mockResolvedValue({
      id: 70,
      status: "shipped",
    });
    repository.transitionStatus.mockResolvedValue({
      ...invoice,
      status: "sent",
    });
    const manager = makeUser(["manager.orders.manage"]);

    await expect(
      service.updateStatus(manager, 20, 30, { status: "sent" }),
    ).resolves.toMatchObject({ status: "sent" });
    expect(
      ordersRepository.synchronizeOrderForInvoiceStatus,
    ).toHaveBeenCalledWith(30, "sent", 1, undefined, {});
    expect(repository.transitionStatus).toHaveBeenCalledWith(
      30,
      "pending",
      "sent",
      1,
      null,
      {},
    );
  });
});
