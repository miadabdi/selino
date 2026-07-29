import { PdfKitReportRenderer } from "./report-pdf.renderer.js";
import type { ManagerReport } from "./reports.types.js";

const report: ManagerReport = {
  range: {
    from: "2026-07-01T00:00:00.000Z",
    to: "2026-07-31T23:59:59.999Z",
    granularity: "day",
  },
  summary: {
    grossSales: 12_000_000,
    grossPurchases: 8_000_000,
    paidSales: 7_000_000,
    outstandingSales: 5_000_000,
    orderCount: 3,
    deliveredOrderCount: 2,
    averageOrderValue: 4_000_000,
    walletBalance: 2_000_000,
    creditLimit: 20_000_000,
    usedCredit: 6_000_000,
    currency: "IRR",
  },
  trend: [
    {
      period: "2026-07-01",
      salesAmount: 12_000_000,
      purchaseAmount: 8_000_000,
      invoiceCount: 3,
    },
  ],
  orderStatuses: [{ status: "delivered", count: 2, amount: 9_000_000 }],
  supplierPerformance: [
    {
      supplierBusinessAccountId: 5,
      supplierName: "تامین کننده نمونه",
      invoiceCount: 3,
      orderCount: 3,
      deliveredOrderCount: 2,
      totalAmount: 12_000_000,
    },
  ],
};

describe("PdfKitReportRenderer", () => {
  const previousFontPath = process.env.REPORT_PDF_FONT_PATH;

  afterEach(() => {
    if (previousFontPath === undefined) {
      delete process.env.REPORT_PDF_FONT_PATH;
    } else {
      process.env.REPORT_PDF_FONT_PATH = previousFontPath;
    }
  });

  it("creates a valid PDF buffer", async () => {
    const buffer = await new PdfKitReportRenderer().render(report);

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1_000);
  });

  it("safely renders Persian text when a configured font is unavailable", async () => {
    process.env.REPORT_PDF_FONT_PATH = "/missing/report-font.ttf";

    await expect(new PdfKitReportRenderer().render(report)).resolves.toEqual(
      expect.any(Buffer),
    );
  });
});
