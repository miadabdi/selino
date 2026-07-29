import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { assertBusinessPermission } from "../auth/permissions/index.js";
import type { ReportQueryDto } from "./dto/report-query.dto.js";
import { ReportExportService } from "./report-export.service.js";
import { ReportsRepository } from "./reports.repository.js";
import {
  REPORT_PDF_RENDERER,
  type ManagerReport,
  type ReportExportFormat,
  type ReportExportResult,
  type ReportPdfRenderer,
  type ReportRange,
} from "./reports.types.js";

@Injectable()
export class ReportsService {
  constructor(
    private readonly repository: ReportsRepository,
    private readonly exportService: ReportExportService,
    @Inject(REPORT_PDF_RENDERER)
    private readonly pdfRenderer: ReportPdfRenderer,
  ) {}

  async getReport(
    user: AuthenticatedUser,
    businessAccountId: number,
    query: ReportQueryDto,
  ): Promise<ManagerReport> {
    assertBusinessPermission(user, businessAccountId, "manager.reports.read");
    return this.loadReport(businessAccountId, query);
  }

  async exportExcel(
    user: AuthenticatedUser,
    businessAccountId: number,
    query: ReportQueryDto,
  ): Promise<ReportExportResult> {
    return this.exportReport(user, businessAccountId, query, "xlsx", (report) =>
      this.exportService.createExcel(report),
    );
  }

  async exportPdf(
    user: AuthenticatedUser,
    businessAccountId: number,
    query: ReportQueryDto,
  ): Promise<ReportExportResult> {
    return this.exportReport(user, businessAccountId, query, "pdf", (report) =>
      this.pdfRenderer.render(report),
    );
  }

  private async exportReport(
    user: AuthenticatedUser,
    businessAccountId: number,
    query: ReportQueryDto,
    format: ReportExportFormat,
    render: (report: ManagerReport) => Promise<Buffer>,
  ): Promise<ReportExportResult> {
    assertBusinessPermission(user, businessAccountId, "manager.reports.export");
    const range = this.resolveRange(query);
    const exportId = await this.repository.createExport(
      businessAccountId,
      user.id,
      range,
      format,
    );
    try {
      const report = await this.loadReportForRange(businessAccountId, range);
      const buffer = await render(report);
      await this.repository.markExportCompleted(exportId);
      const date = new Date().toISOString().slice(0, 10);
      return {
        exportId,
        buffer,
        filename: `manager-report-${date}.${format}`,
      };
    } catch (error) {
      await this.recordExportFailure(exportId, error);
      throw error;
    }
  }

  private async recordExportFailure(exportId: number, error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown export error";
    try {
      await this.repository.markExportFailed(exportId, message);
    } catch {
      // Preserve the original rendering or data error.
    }
  }

  private async loadReport(
    businessAccountId: number,
    query: ReportQueryDto,
  ): Promise<ManagerReport> {
    return this.loadReportForRange(businessAccountId, this.resolveRange(query));
  }

  private async loadReportForRange(
    businessAccountId: number,
    range: ReportRange,
  ): Promise<ManagerReport> {
    const report = await this.repository.getReport(businessAccountId, range);
    return {
      range: {
        from: range.from.toISOString(),
        to: new Date(range.to.getTime() - 1).toISOString(),
        granularity: range.granularity,
      },
      ...report,
    };
  }

  private resolveRange(query: ReportQueryDto): ReportRange {
    const to = query.to ? new Date(query.to) : new Date();
    to.setUTCHours(23, 59, 59, 999);
    const exclusiveTo = new Date(to.getTime() + 1);
    const from = query.from
      ? new Date(query.from)
      : new Date(exclusiveTo.getTime() - 30 * 24 * 60 * 60 * 1000);
    from.setUTCHours(0, 0, 0, 0);
    if (from >= exclusiveTo) {
      throw new BadRequestException(
        "Report period start must be before its end",
      );
    }
    return {
      from,
      to: exclusiveTo,
      granularity: query.granularity,
      supplierBusinessAccountId: query.supplierBusinessAccountId,
    };
  }
}
