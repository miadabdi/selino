import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import type { InvoicesRepository } from "./invoices.repository";

type ExportInvoice = Awaited<
  ReturnType<InvoicesRepository["findManyForExport"]>
>[number];

@Injectable()
export class InvoiceExportService {
  async createWorkbook(invoices: ExportInvoice[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Selino";
    workbook.created = new Date();

    const invoicesSheet = workbook.addWorksheet("Invoices", {
      views: [{ rightToLeft: true }],
    });
    invoicesSheet.columns = [
      { header: "شماره فاکتور", key: "invoiceNumber", width: 18 },
      { header: "خریدار", key: "buyer", width: 28 },
      { header: "تامین‌کننده", key: "supplier", width: 28 },
      { header: "تاریخ ثبت", key: "createdAt", width: 22 },
      { header: "وضعیت", key: "status", width: 24 },
      { header: "مبلغ کل", key: "totalAmount", width: 18 },
      { header: "ارز", key: "currency", width: 12 },
    ];

    const itemsSheet = workbook.addWorksheet("Items", {
      views: [{ rightToLeft: true }],
    });
    itemsSheet.columns = [
      { header: "شماره فاکتور", key: "invoiceNumber", width: 18 },
      { header: "نام کالا", key: "productTitle", width: 32 },
      { header: "مدل", key: "productModel", width: 22 },
      { header: "شرح", key: "description", width: 38 },
      { header: "تعداد", key: "qty", width: 12 },
      { header: "قیمت واحد", key: "unitPrice", width: 18 },
      { header: "مبلغ ردیف", key: "total", width: 18 },
    ];

    for (const invoice of invoices) {
      invoicesSheet.addRow({
        invoiceNumber: invoice.invoiceNumber,
        buyer: invoice.buyerBusinessAccount.name,
        supplier: invoice.supplierBusinessAccount.name,
        createdAt: invoice.createdAt,
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
      });

      for (const item of invoice.items) {
        itemsSheet.addRow({
          invoiceNumber: invoice.invoiceNumber,
          productTitle:
            item.product?.title ??
            item.description ??
            `#${item.productId ?? ""}`,
          productModel: item.product?.model ?? "",
          description: item.description ?? "",
          qty: item.qty,
          unitPrice: item.unitPrice,
          total: item.total,
        });
      }
    }

    this.styleWorksheet(invoicesSheet, ["totalAmount"]);
    this.styleWorksheet(itemsSheet, ["qty", "unitPrice", "total"]);

    const workbookBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(workbookBuffer);
  }

  private styleWorksheet(
    worksheet: ExcelJS.Worksheet,
    numericColumnKeys: string[],
  ) {
    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF00796F" },
    };
    header.alignment = { horizontal: "center", vertical: "middle" };
    header.height = 24;

    for (const key of numericColumnKeys) {
      const column = worksheet.getColumn(key);
      column.numFmt = "#,##0";
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: "middle" };
      }
    });
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columnCount },
    };
    worksheet.views = [{ rightToLeft: true, state: "frozen", ySplit: 1 }];
  }
}
