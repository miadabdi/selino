import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import {
  PermissionsGuard,
  RequireAnyPermission,
  RequirePermissions,
} from "../auth/permissions";
import { ExportInvoicesDto } from "./dto/export-invoices.dto";
import { ListInvoicesQueryDto } from "./dto/list-invoices-query.dto";
import { UpdateInvoiceStatusDto } from "./dto/update-invoice-status.dto";
import { InvoicesService } from "./invoices.service";
import * as Swagger from "./invoices.swagger";

const invoiceReadPermissions = [
  "seller.invoices.active.read.own",
  "seller.invoices.active.read.all",
  "seller.invoices.history.read.own",
  "seller.invoices.history.read.all",
] as const;

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("business-accounts/:businessAccountId/invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequireAnyPermission(...invoiceReadPermissions)
  @Swagger.List()
  list(
    @Req() req: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Query() query: ListInvoicesQueryDto,
  ) {
    return this.invoicesService.list(
      req.user as AuthenticatedUser,
      businessAccountId,
      query,
    );
  }

  @Get(":id")
  @RequireAnyPermission(...invoiceReadPermissions)
  @Swagger.Get()
  get(
    @Req() req: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.invoicesService.get(
      req.user as AuthenticatedUser,
      businessAccountId,
      id,
    );
  }

  @Patch(":id/status")
  @RequirePermissions("manager.orders.manage")
  @Swagger.UpdateStatus()
  updateStatus(
    @Req() req: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    return this.invoicesService.updateStatus(
      req.user as AuthenticatedUser,
      businessAccountId,
      id,
      dto,
    );
  }

  @Post("export")
  @RequireAnyPermission(...invoiceReadPermissions)
  @Swagger.Export()
  async export(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Body() dto: ExportInvoicesDto,
  ) {
    const result = await this.invoicesService.export(
      req.user as AuthenticatedUser,
      businessAccountId,
      dto,
    );
    response.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    return new StreamableFile(result.buffer);
  }
}
