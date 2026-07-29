import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { ReportExportService } from "./report-export.service.js";
import { ReportsRepository } from "./reports.repository.js";
import { ReportsService } from "./reports.service.js";
import type { ReportPdfRenderer } from "./reports.types.js";

function makeUser(permissions: string[]): AuthenticatedUser {
  return {
    id: 1,
    isAdmin: false,
    permissions,
    businessMemberships: [
      {
        id: 2,
        businessAccountId: 20,
        businessName: "فروشگاه نمونه",
        role: "manager",
        permissions,
        isActive: true,
      },
    ],
  } as AuthenticatedUser;
}

const reportData = {
  summary: {},
  trend: [],
  orderStatuses: [],
  supplierPerformance: [],
};

describe("ReportsService", () => {
  const repository = {
    getReport: jest.fn(),
    createExport: jest.fn(),
    markExportCompleted: jest.fn(),
    markExportFailed: jest.fn(),
  };
  const exportService = { createExcel: jest.fn() };
  const pdfRenderer = { render: jest.fn() };
  const service = new ReportsService(
    repository as unknown as ReportsRepository,
    exportService as unknown as ReportExportService,
    pdfRenderer as unknown as ReportPdfRenderer,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.getReport.mockResolvedValue(reportData);
    repository.createExport.mockResolvedValue(44);
    repository.markExportCompleted.mockResolvedValue(undefined);
    repository.markExportFailed.mockResolvedValue(undefined);
  });

  it("returns scoped report aggregates", async () => {
    await service.getReport(makeUser(["manager.reports.read"]), 20, {
      granularity: "week",
    });

    expect(repository.getReport).toHaveBeenCalledWith(
      20,
      expect.objectContaining({ granularity: "week" }),
    );
  });

  it("requires a separate export permission", async () => {
    await expect(
      service.exportExcel(makeUser(["manager.reports.read"]), 20, {
        granularity: "day",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(exportService.createExcel).not.toHaveBeenCalled();
  });

  it("exports the same report model used by the JSON endpoint", async () => {
    exportService.createExcel.mockResolvedValue(Buffer.from("xlsx"));

    const result = await service.exportExcel(
      makeUser(["manager.reports.export"]),
      20,
      { granularity: "month" },
    );

    expect(exportService.createExcel).toHaveBeenCalledWith(
      expect.objectContaining({
        range: expect.objectContaining({ granularity: "month" }),
        ...reportData,
      }),
    );
    expect(result.filename).toMatch(/^manager-report-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(result.exportId).toBe(44);
    expect(repository.createExport).toHaveBeenCalledWith(
      20,
      1,
      expect.objectContaining({ granularity: "month" }),
      "xlsx",
    );
    expect(repository.markExportCompleted).toHaveBeenCalledWith(44);
  });

  it("exports PDF and completes its audit record", async () => {
    pdfRenderer.render.mockResolvedValue(Buffer.from("%PDF"));

    const result = await service.exportPdf(
      makeUser(["manager.reports.export"]),
      20,
      { granularity: "day" },
    );

    expect(pdfRenderer.render).toHaveBeenCalledWith(
      expect.objectContaining(reportData),
    );
    expect(repository.createExport).toHaveBeenCalledWith(
      20,
      1,
      expect.objectContaining({ granularity: "day" }),
      "pdf",
    );
    expect(repository.markExportCompleted).toHaveBeenCalledWith(44);
    expect(result.filename).toMatch(/^manager-report-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("marks a PDF export as failed when rendering fails", async () => {
    pdfRenderer.render.mockRejectedValue(new Error("render failed"));

    await expect(
      service.exportPdf(makeUser(["manager.reports.export"]), 20, {
        granularity: "day",
      }),
    ).rejects.toThrow("render failed");

    expect(repository.markExportFailed).toHaveBeenCalledWith(
      44,
      "render failed",
    );
    expect(repository.markExportCompleted).not.toHaveBeenCalled();
  });
});
