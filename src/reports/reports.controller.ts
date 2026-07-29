import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import {
  PermissionsGuard,
  RequirePermissions,
} from "../auth/permissions/index.js";
import { ReportQueryDto } from "./dto/report-query.dto.js";
import { ReportsService } from "./reports.service.js";
import * as Swagger from "./reports.swagger.js";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("business-accounts/:businessAccountId/reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @RequirePermissions("manager.reports.read")
  @Get()
  @Swagger.GetReport()
  getReport(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getReport(
      request.user as AuthenticatedUser,
      businessAccountId,
      query,
    );
  }

  @RequirePermissions("manager.reports.export")
  @Get("export/excel")
  @Swagger.ExportExcel()
  async exportExcel(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Query() query: ReportQueryDto,
  ) {
    const result = await this.reportsService.exportExcel(
      request.user as AuthenticatedUser,
      businessAccountId,
      query,
    );
    this.setDownloadHeaders(
      response,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      result.filename,
      result.buffer.length,
    );
    return new StreamableFile(result.buffer);
  }

  @RequirePermissions("manager.reports.export")
  @Get("export/pdf")
  @Swagger.ExportPdf()
  async exportPdf(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Query() query: ReportQueryDto,
  ) {
    const result = await this.reportsService.exportPdf(
      request.user as AuthenticatedUser,
      businessAccountId,
      query,
    );
    this.setDownloadHeaders(
      response,
      "application/pdf",
      result.filename,
      result.buffer.length,
    );
    return new StreamableFile(result.buffer);
  }

  private setDownloadHeaders(
    response: Response,
    contentType: string,
    filename: string,
    contentLength: number,
  ) {
    const encodedFilename = encodeURIComponent(filename);
    response.setHeader("Content-Type", contentType);
    response.setHeader("Content-Length", contentLength);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
    );
  }
}
