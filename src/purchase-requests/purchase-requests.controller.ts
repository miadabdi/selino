import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { PermissionsGuard, RequirePermissions } from "../auth/index";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { AddPurchaseRequestItemDto } from "./dto/add-purchase-request-item.dto";
import { GetActivePurchaseRequestQueryDto } from "./dto/get-active-purchase-request-query.dto";
import { ListPurchaseRequestsQueryDto } from "./dto/list-purchase-requests-query.dto";
import { PurchaseRequestsService } from "./purchase-requests.service";
import * as Swagger from "./purchase-requests.swagger";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("purchase-requests")
export class PurchaseRequestsController {
  constructor(
    private readonly purchaseRequestsService: PurchaseRequestsService,
  ) {}

  @Post("items")
  @RequirePermissions("seller.purchase-requests.write")
  @Swagger.AddItem()
  addItem(@Req() req: Request, @Body() dto: AddPurchaseRequestItemDto) {
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.addItem(user, dto);
  }

  @Delete("items/:itemId")
  @RequirePermissions("seller.purchase-requests.write")
  @Swagger.RemoveItem()
  removeItem(
    @Req() req: Request,
    @Param("itemId", ParseIntPipe) itemId: number,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.removeItem(user, itemId);
  }

  @Get("active")
  @RequirePermissions("seller.purchase-requests.read")
  @Swagger.GetActive()
  getActive(
    @Req() req: Request,
    @Query() query: GetActivePurchaseRequestQueryDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.getActive(
      user,
      query.buyerBusinessAccountId,
    );
  }

  @Get()
  @RequirePermissions("seller.purchase-requests.read")
  @Swagger.List()
  list(@Req() req: Request, @Query() query: ListPurchaseRequestsQueryDto) {
    return this.purchaseRequestsService.list(
      req.user as AuthenticatedUser,
      query,
    );
  }

  @Post(":id/confirm")
  @RequirePermissions("seller.purchase-requests.write")
  @Swagger.Confirm()
  confirm(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.confirm(user, id);
  }

  @Post(":id/cancel")
  @RequirePermissions("seller.purchase-requests.write")
  @Swagger.Cancel()
  cancel(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.cancel(user, id);
  }
}
