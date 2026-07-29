import { Injectable } from "@nestjs/common";
import { existsSync } from "node:fs";
import PDFDocument from "pdfkit";
import type { ManagerReport, ReportPdfRenderer } from "./reports.types.js";

const PERSIAN_DIGITS: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

const PERSIAN_TRANSLITERATION: Record<string, string> = {
  ا: "a",
  آ: "a",
  ب: "b",
  پ: "p",
  ت: "t",
  ث: "s",
  ج: "j",
  چ: "ch",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "z",
  ر: "r",
  ز: "z",
  ژ: "zh",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "z",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "gh",
  ک: "k",
  ك: "k",
  گ: "g",
  ل: "l",
  م: "m",
  ن: "n",
  و: "v",
  ه: "h",
  ة: "h",
  ی: "y",
  ي: "y",
  ئ: "y",
  ء: "",
  "‌": " ",
};

const FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
];

@Injectable()
export class PdfKitReportRenderer implements ReportPdfRenderer {
  async render(report: ManagerReport): Promise<Buffer> {
    const document = new PDFDocument({
      size: "A4",
      margin: 42,
      bufferPages: true,
      compress: true,
      info: {
        Title: "Selino Manager Report",
        Author: "Selino",
        Subject: "Business performance report",
      },
    });
    const chunks: Buffer[] = [];
    const completed = new Promise<Buffer>((resolve, reject) => {
      document.on("data", (chunk: Buffer) => chunks.push(chunk));
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);
    });

    const fontPath = this.resolveUnicodeFont();
    if (fontPath) {
      document.registerFont("ReportFont", fontPath);
      document.font("ReportFont");
    }
    const text = (value: unknown) => this.safeText(value, Boolean(fontPath));

    this.renderHeader(document, report, text);
    this.renderSummary(document, report, text);
    this.renderTrend(document, report, text);
    this.renderOrderStatuses(document, report, text);
    this.renderSuppliers(document, report, text);
    this.renderPageNumbers(document);
    document.end();

    return completed;
  }

  private renderHeader(
    document: PDFKit.PDFDocument,
    report: ManagerReport,
    text: (value: unknown) => string,
  ) {
    document
      .fillColor("#00796f")
      .fontSize(22)
      .text("Selino Manager Report", { align: "left" });
    document
      .moveDown(0.4)
      .fillColor("#3f4a4a")
      .fontSize(10)
      .text(
        text(
          `${report.range.from.slice(0, 10)} to ${report.range.to.slice(0, 10)} | ${report.range.granularity}`,
        ),
      );
    document.moveDown(1);
  }

  private renderSummary(
    document: PDFKit.PDFDocument,
    report: ManagerReport,
    text: (value: unknown) => string,
  ) {
    this.sectionTitle(document, "Summary");
    const values: Array<[string, string | number]> = [
      ["Gross sales", report.summary.grossSales],
      ["Gross purchases", report.summary.grossPurchases],
      ["Paid sales", report.summary.paidSales],
      ["Outstanding sales", report.summary.outstandingSales],
      ["Orders", report.summary.orderCount],
      ["Delivered orders", report.summary.deliveredOrderCount],
      ["Average order value", report.summary.averageOrderValue],
      ["Wallet balance", report.summary.walletBalance],
      ["Credit limit", report.summary.creditLimit],
      ["Used credit", report.summary.usedCredit],
      ["Currency", report.summary.currency],
    ];
    values.forEach(([label, value]) => {
      this.ensureSpace(document, 20);
      document
        .fontSize(9)
        .fillColor("#3f4a4a")
        .text(`${label}: ${text(this.formatValue(value))}`);
    });
    document.moveDown(0.8);
  }

  private renderTrend(
    document: PDFKit.PDFDocument,
    report: ManagerReport,
    text: (value: unknown) => string,
  ) {
    this.sectionTitle(document, "Sales and purchase trend");
    this.tableHeader(document, [
      ["Period", 120],
      ["Sales", 120],
      ["Purchases", 120],
      ["Invoices", 100],
    ]);
    if (report.trend.length === 0) {
      this.emptyRow(document);
    }
    report.trend.forEach((row) => {
      this.tableRow(document, text, [
        [row.period, 120],
        [this.formatValue(row.salesAmount), 120],
        [this.formatValue(row.purchaseAmount), 120],
        [row.invoiceCount, 100],
      ]);
    });
    document.moveDown(0.8);
  }

  private renderOrderStatuses(
    document: PDFKit.PDFDocument,
    report: ManagerReport,
    text: (value: unknown) => string,
  ) {
    this.sectionTitle(document, "Order statuses");
    this.tableHeader(document, [
      ["Status", 180],
      ["Count", 120],
      ["Amount", 160],
    ]);
    if (report.orderStatuses.length === 0) {
      this.emptyRow(document);
    }
    report.orderStatuses.forEach((row) => {
      this.tableRow(document, text, [
        [row.status, 180],
        [row.count, 120],
        [this.formatValue(row.amount), 160],
      ]);
    });
    document.moveDown(0.8);
  }

  private renderSuppliers(
    document: PDFKit.PDFDocument,
    report: ManagerReport,
    text: (value: unknown) => string,
  ) {
    this.sectionTitle(document, "Supplier performance");
    this.tableHeader(document, [
      ["Supplier", 190],
      ["Invoices", 70],
      ["Orders", 70],
      ["Delivered", 70],
      ["Total", 100],
    ]);
    if (report.supplierPerformance.length === 0) {
      this.emptyRow(document);
    }
    report.supplierPerformance.forEach((row) => {
      this.tableRow(document, text, [
        [row.supplierName, 190],
        [row.invoiceCount, 70],
        [row.orderCount, 70],
        [row.deliveredOrderCount, 70],
        [this.formatValue(row.totalAmount), 100],
      ]);
    });
  }

  private sectionTitle(document: PDFKit.PDFDocument, title: string) {
    this.ensureSpace(document, 32);
    document.fillColor("#00796f").fontSize(13).text(title).moveDown(0.4);
  }

  private tableHeader(
    document: PDFKit.PDFDocument,
    columns: Array<[string, number]>,
  ) {
    this.ensureSpace(document, 28);
    const y = document.y;
    document.rect(document.page.margins.left, y - 3, 500, 20).fill("#00796f");
    let x = document.page.margins.left + 5;
    columns.forEach(([label, width]) => {
      document
        .fillColor("#ffffff")
        .fontSize(8)
        .text(label, x, y + 2, { width: width - 8, height: 14 });
      x += width;
    });
    document.y = y + 23;
  }

  private tableRow(
    document: PDFKit.PDFDocument,
    text: (value: unknown) => string,
    columns: Array<[unknown, number]>,
  ) {
    this.ensureSpace(document, 24);
    const y = document.y;
    let x = document.page.margins.left + 5;
    columns.forEach(([value, width]) => {
      document
        .fillColor("#263238")
        .fontSize(8)
        .text(text(value), x, y, {
          width: width - 8,
          height: 18,
          ellipsis: true,
        });
      x += width;
    });
    document
      .moveTo(document.page.margins.left, y + 20)
      .lineTo(document.page.width - document.page.margins.right, y + 20)
      .strokeColor("#dfe5e4")
      .stroke();
    document.y = y + 24;
  }

  private emptyRow(document: PDFKit.PDFDocument) {
    this.ensureSpace(document, 24);
    document.fillColor("#667573").fontSize(8).text("No data for this period.");
    document.moveDown(0.8);
  }

  private ensureSpace(document: PDFKit.PDFDocument, height: number) {
    const bottom = document.page.height - document.page.margins.bottom;
    if (document.y + height > bottom) {
      document.addPage();
    }
  }

  private renderPageNumbers(document: PDFKit.PDFDocument) {
    const range = document.bufferedPageRange();
    for (
      let index = range.start;
      index < range.start + range.count;
      index += 1
    ) {
      document.switchToPage(index);
      document
        .fillColor("#667573")
        .fontSize(8)
        .text(
          `Page ${index - range.start + 1} of ${range.count}`,
          document.page.margins.left,
          document.page.height - 30,
          {
            width:
              document.page.width -
              document.page.margins.left -
              document.page.margins.right,
            align: "center",
            lineBreak: false,
          },
        );
    }
  }

  private resolveUnicodeFont(): string | undefined {
    const candidates = [
      process.env.REPORT_PDF_FONT_PATH,
      ...FONT_CANDIDATES,
    ].filter((path): path is string => Boolean(path));
    return candidates.find((path) => existsSync(path));
  }

  private safeText(value: unknown, hasUnicodeFont: boolean): string {
    const input =
      value === null || value === undefined
        ? ""
        : typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "bigint" ||
            typeof value === "boolean"
          ? String(value)
          : "[unsupported value]";
    if (hasUnicodeFont) {
      return input.split("\u0000").join("");
    }
    return [...input.normalize("NFKC")]
      .map((character) => {
        if (PERSIAN_DIGITS[character] !== undefined) {
          return PERSIAN_DIGITS[character];
        }
        if (PERSIAN_TRANSLITERATION[character] !== undefined) {
          return PERSIAN_TRANSLITERATION[character];
        }
        return /^[\x20-\x7e]$/.test(character) ? character : "?";
      })
      .join("")
      .replace(/\?+/g, "?");
  }

  private formatValue(value: string | number): string {
    return typeof value === "number"
      ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
          value,
        )
      : value;
  }
}
