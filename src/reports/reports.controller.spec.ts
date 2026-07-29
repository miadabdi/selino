jest.mock("../auth/guards/jwt-auth.guard.js", () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));
jest.mock("../auth/guards/user-enrichment.guard.js", () => ({
  UserEnrichmentGuard: class UserEnrichmentGuard {},
}));
jest.mock("../auth/permissions/index.js", () => ({
  PermissionsGuard: class PermissionsGuard {},
  RequirePermissions: () => () => undefined,
}));

import type { Response } from "express";
import { StreamableFile } from "@nestjs/common";
import { ReportsController } from "./reports.controller.js";
import { ReportsService } from "./reports.service.js";

describe("ReportsController", () => {
  const service = {
    exportPdf: jest.fn(),
  };
  const controller = new ReportsController(
    service as unknown as ReportsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns PDF content with download headers", async () => {
    const buffer = Buffer.from("%PDF-test");
    service.exportPdf.mockResolvedValue({
      exportId: 7,
      buffer,
      filename: "manager-report-2026-07-29.pdf",
    });
    const setHeader = jest.fn();
    const response = {
      setHeader,
    } as unknown as Response;
    const request = {
      user: { id: 1 },
    };

    const result = await controller.exportPdf(request as never, response, 20, {
      granularity: "day",
    });

    expect(setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(setHeader).toHaveBeenCalledWith("Content-Length", buffer.length);
    expect(setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringContaining('filename="manager-report-2026-07-29.pdf"'),
    );
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
