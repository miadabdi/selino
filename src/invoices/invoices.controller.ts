import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { ExportInvoicesDto } from "./dto/export-invoices.dto";
import { ListInvoicesQueryDto } from "./dto/list-invoices-query.dto";
import { InvoicesService } from "./invoices.service";
import * as Swagger from "./invoices.swagger";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard)
@Controller("business-accounts/:businessAccountId/invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
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

  @Post("export")
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
