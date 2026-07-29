import type { ReportGranularity } from "./dto/report-query.dto.js";

export type ReportRange = {
  from: Date;
  to: Date;
  granularity: ReportGranularity;
  supplierBusinessAccountId?: number;
};

export type ManagerReport = {
  range: {
    from: string;
    to: string;
    granularity: ReportGranularity;
  };
  summary: {
    grossSales: number;
    grossPurchases: number;
    paidSales: number;
    outstandingSales: number;
    orderCount: number;
    deliveredOrderCount: number;
    averageOrderValue: number;
    walletBalance: number;
    creditLimit: number;
    usedCredit: number;
    currency: string;
  };
  trend: Array<{
    period: string;
    salesAmount: number;
    purchaseAmount: number;
    invoiceCount: number;
  }>;
  orderStatuses: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  supplierPerformance: Array<{
    supplierBusinessAccountId: number;
    supplierName: string;
    invoiceCount: number;
    orderCount: number;
    deliveredOrderCount: number;
    totalAmount: number;
  }>;
};

export interface ReportPdfRenderer {
  render(report: ManagerReport): Promise<Buffer>;
}

export const REPORT_PDF_RENDERER = Symbol("REPORT_PDF_RENDERER");

export const reportExportFormats = ["xlsx", "pdf"] as const;
export type ReportExportFormat = (typeof reportExportFormats)[number];

export type ReportExportResult = {
  exportId: number;
  buffer: Buffer;
  filename: string;
};
