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
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { PermissionsGuard, RequirePermissions } from "../auth/permissions";
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";
import * as Swagger from "./orders.swagger";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@RequirePermissions("manager.orders.track")
@Controller("business-accounts/:businessAccountId/orders")
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  @Swagger.List()
  list(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Req() req: Request,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.service.list(
      businessAccountId,
      req.user as AuthenticatedUser,
      query,
    );
  }

  @Get(":id")
  @Swagger.GetOrder()
  get(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.service.get(
      businessAccountId,
      id,
      req.user as AuthenticatedUser,
    );
  }

  @Post("from-invoice/:invoiceId")
  @RequirePermissions("manager.orders.manage")
  @Swagger.DeriveFromInvoice()
  derive(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("invoiceId", ParseIntPipe) invoiceId: number,
    @Req() req: Request,
  ) {
    return this.service.deriveFromConfirmedInvoice(
      businessAccountId,
      invoiceId,
      req.user as AuthenticatedUser,
    );
  }

  @Patch(":id/status")
  @RequirePermissions("manager.orders.manage")
  @Swagger.UpdateStatus()
  updateStatus(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateStatus(
      businessAccountId,
      id,
      req.user as AuthenticatedUser,
      dto,
    );
  }
}
