import { Module } from "@nestjs/common";
import { ReportExportService } from "./report-export.service.js";
import { PdfKitReportRenderer } from "./report-pdf.renderer.js";
import { ReportsController } from "./reports.controller.js";
import { ReportsRepository } from "./reports.repository.js";
import { ReportsService } from "./reports.service.js";
import { REPORT_PDF_RENDERER } from "./reports.types.js";

@Module({
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsRepository,
    ReportExportService,
    PdfKitReportRenderer,
    {
      provide: REPORT_PDF_RENDERER,
      useExisting: PdfKitReportRenderer,
    },
  ],
  exports: [ReportsService, ReportsRepository, ReportExportService],
})
export class ReportsModule {}
