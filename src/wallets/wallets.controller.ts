import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { AdjustWalletDto } from "./dto/adjust-wallet.dto";
import { ListWalletTransactionsQueryDto } from "./dto/list-wallet-transactions-query.dto";
import { WalletsService } from "./wallets.service";
import * as Swagger from "./wallets.swagger";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("business-accounts/:businessAccountId/wallet")
export class WalletsController {
  constructor(private readonly service: WalletsService) {}

  @RequireAnyPermission(
    "seller.dashboard.overview",
    "manager.dashboard.overview",
  )
  @Get()
  @Swagger.GetWallet()
  get(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Req() req: Request,
  ) {
    return this.service.get(businessAccountId, req.user as AuthenticatedUser);
  }

  @RequireAnyPermission(
    "seller.dashboard.overview",
    "manager.dashboard.overview",
  )
  @Get("transactions")
  @Swagger.ListTransactions()
  listTransactions(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Req() req: Request,
    @Query() query: ListWalletTransactionsQueryDto,
  ) {
    return this.service.listTransactions(
      businessAccountId,
      req.user as AuthenticatedUser,
      query,
    );
  }

  @RequirePermissions("manager.credit.manage")
  @Post("adjustments")
  @Swagger.Adjust()
  adjust(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Req() req: Request,
    @Body() dto: AdjustWalletDto,
  ) {
    return this.service.adjust(
      businessAccountId,
      req.user as AuthenticatedUser,
      dto,
    );
  }
}
