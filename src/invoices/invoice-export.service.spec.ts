import ExcelJS from "exceljs";
import { InvoiceExportService } from "./invoice-export.service";

describe("InvoiceExportService", () => {
  it("creates separate invoice and item worksheets for the selected data", async () => {
    const service = new InvoiceExportService();
    const buffer = await service.createWorkbook([
      {
        id: 11,
        invoiceNumber: "INV-1001",
        buyerBusinessAccountId: 3,
        supplierBusinessAccountId: 7,
        purchaseRequestId: null,
        status: "paid",
        currency: "IRR",
        totalAmount: 1_500_000,
        paidAt: new Date("2026-07-20T10:00:00.000Z"),
        dueAt: null,
        meta: {},
        createdAt: new Date("2026-07-18T10:00:00.000Z"),
        updatedAt: new Date("2026-07-20T10:00:00.000Z"),
        buyerBusinessAccount: { name: "خریدار نمونه" },
        supplierBusinessAccount: { name: "فروشنده نمونه" },
        items: [
          {
            id: 21,
            invoiceId: 11,
            productId: 31,
            storeInventoryId: null,
            description: "بسته آزمایشی",
            qty: 3,
            unitPrice: 500_000,
            total: 1_500_000,
            createdAt: new Date("2026-07-18T10:00:00.000Z"),
            product: { title: "کالای نمونه", model: "M-1" },
          },
        ],
      },
    ] as never);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const invoicesSheet = workbook.getWorksheet("Invoices");
    const itemsSheet = workbook.getWorksheet("Items");
    expect(invoicesSheet).toBeDefined();
    expect(itemsSheet).toBeDefined();
    expect(invoicesSheet?.rowCount).toBe(2);
    expect(itemsSheet?.rowCount).toBe(2);
    expect(invoicesSheet?.getCell("A2").value).toBe("INV-1001");
    expect(invoicesSheet?.getCell("F2").value).toBe(1_500_000);
    expect(itemsSheet?.getCell("B2").value).toBe("کالای نمونه");
    expect(itemsSheet?.getCell("G2").value).toBe(1_500_000);
    expect(invoicesSheet?.views[0]?.rightToLeft).toBe(true);
    expect(itemsSheet?.views[0]?.rightToLeft).toBe(true);
  });
});
