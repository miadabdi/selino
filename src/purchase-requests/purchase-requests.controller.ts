import {
  Body,
  Controller,
  Delete,
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
import {
  PermissionsGuard,
  RequireAnyPermission,
  RequirePermissions,
} from "../auth/permissions";
import { AddPurchaseRequestItemDto } from "./dto/add-purchase-request-item.dto";
import { GetActivePurchaseRequestQueryDto } from "./dto/get-active-purchase-request-query.dto";
import { ListPurchaseRequestsQueryDto } from "./dto/list-purchase-requests-query.dto";
import { UpdatePurchaseRequestItemDto } from "./dto/update-purchase-request-item.dto";
import { PurchaseRequestsService } from "./purchase-requests.service";
import * as Swagger from "./purchase-requests.swagger";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("purchase-requests")
export class PurchaseRequestsController {
  constructor(
    private readonly purchaseRequestsService: PurchaseRequestsService,
  ) {}

  @RequirePermissions("seller.purchase-requests.create")
  @Post("items")
  @Swagger.AddItem()
  addItem(@Req() req: Request, @Body() dto: AddPurchaseRequestItemDto) {
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.addItem(user, dto);
  }

  @RequireAnyPermission(
    "seller.purchase-requests.cancel.own",
    "seller.purchase-requests.cancel.all",
  )
  @Patch("items/:itemId")
  @Swagger.UpdateItem()
  updateItem(
    @Req() req: Request,
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() dto: UpdatePurchaseRequestItemDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.updateItem(user, itemId, dto);
  }

  @RequireAnyPermission(
    "seller.purchase-requests.cancel.own",
    "seller.purchase-requests.cancel.all",
  )
  @Delete("items/:itemId")
  @Swagger.RemoveItem()
  removeItem(
    @Req() req: Request,
    @Param("itemId", ParseIntPipe) itemId: number,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.removeItem(user, itemId);
  }

  @RequireAnyPermission(
    "seller.purchase-requests.read.own",
    "seller.purchase-requests.read.all",
  )
  @Get("active")
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

  @RequireAnyPermission(
    "seller.purchase-requests.read.own",
    "seller.purchase-requests.read.all",
  )
  @Get()
  @Swagger.List()
  list(@Req() req: Request, @Query() query: ListPurchaseRequestsQueryDto) {
    return this.purchaseRequestsService.list(
      req.user as AuthenticatedUser,
      query,
    );
  }

  @RequireAnyPermission(
    "seller.purchase-requests.read.own",
    "seller.purchase-requests.read.all",
  )
  @Get(":id")
  @Swagger.GetById()
  get(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    return this.purchaseRequestsService.get(req.user as AuthenticatedUser, id);
  }

  @RequireAnyPermission(
    "seller.purchase-requests.confirm.own",
    "seller.purchase-requests.confirm.all",
  )
  @Post(":id/confirm")
  @Swagger.Confirm()
  confirm(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.confirm(user, id);
  }

  @RequireAnyPermission(
    "seller.purchase-requests.cancel.own",
    "seller.purchase-requests.cancel.all",
  )
  @Post(":id/cancel")
  @Swagger.Cancel()
  cancel(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.cancel(user, id);
  }
}
