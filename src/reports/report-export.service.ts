import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import type { ManagerReport } from "./reports.types.js";

@Injectable()
export class ReportExportService {
  async createExcel(report: ManagerReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Selino";
    workbook.created = new Date();

    const summary = workbook.addWorksheet("Summary", {
      views: [{ rightToLeft: true }],
    });
    summary.columns = [
      { header: "شاخص", key: "metric", width: 30 },
      { header: "مقدار", key: "value", width: 22 },
    ];
    Object.entries(report.summary).forEach(([metric, value]) => {
      summary.addRow({ metric, value });
    });

    const trend = workbook.addWorksheet("Trend", {
      views: [{ rightToLeft: true }],
    });
    trend.columns = [
      { header: "دوره", key: "period", width: 18 },
      { header: "فروش", key: "salesAmount", width: 22 },
      { header: "خرید", key: "purchaseAmount", width: 22 },
      { header: "تعداد فاکتور", key: "invoiceCount", width: 18 },
    ];
    trend.addRows(report.trend);

    const suppliers = workbook.addWorksheet("Suppliers", {
      views: [{ rightToLeft: true }],
    });
    suppliers.columns = [
      { header: "تامین‌کننده", key: "supplierName", width: 30 },
      { header: "تعداد فاکتور", key: "invoiceCount", width: 18 },
      { header: "تعداد سفارش", key: "orderCount", width: 18 },
      { header: "تحویل‌شده", key: "deliveredOrderCount", width: 18 },
      { header: "مبلغ کل", key: "totalAmount", width: 22 },
    ];
    suppliers.addRows(report.supplierPerformance);

    for (const worksheet of workbook.worksheets) {
      this.styleWorksheet(worksheet);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private styleWorksheet(worksheet: ExcelJS.Worksheet) {
    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF00796F" },
    };
    header.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columnCount },
    };
    worksheet.views = [{ rightToLeft: true, state: "frozen", ySplit: 1 }];
  }
}
