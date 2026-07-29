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
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { PermissionsGuard, RequirePermissions } from "../auth/permissions";
import { ApproveOverLimitTradeDto } from "./dto/approve-over-limit-trade.dto";
import { CreateTradeCreditAgreementDto } from "./dto/create-trade-credit-agreement.dto";
import { RejectOverLimitTradeDto } from "./dto/reject-over-limit-trade.dto";
import { SearchTradeOffersQueryDto } from "./dto/search-trade-offers-query.dto";
import { SuspendTradeCreditAgreementDto } from "./dto/suspend-trade-credit-agreement.dto";
import { TradeNetworkService } from "./trade-network.service";

@ApiTags("Trade Network")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("trade-network")
export class TradeNetworkController {
  constructor(private readonly tradeNetworkService: TradeNetworkService) {}

  @RequirePermissions("seller.inventory.read")
  @Get("offers/search")
  searchOffers(@Req() req: Request, @Query() query: SearchTradeOffersQueryDto) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.searchOffers(user, query);
  }

  @RequirePermissions("manager.agreements.create")
  @Post("credit-agreements")
  createAgreement(
    @Req() req: Request,
    @Body() dto: CreateTradeCreditAgreementDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.createAgreement(user, dto);
  }

  @RequirePermissions("manager.agreements.sign")
  @Post("credit-agreements/:id/sign")
  signAgreement(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.signAgreement(user, id);
  }

  @RequirePermissions("manager.agreements.activate")
  @Post("credit-agreements/:id/activate")
  activateAgreement(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.activateAgreement(user, id);
  }

  @RequirePermissions("manager.agreements.suspend")
  @Post("credit-agreements/:id/suspend")
  suspendAgreement(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SuspendTradeCreditAgreementDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.suspendAgreement(user, id, dto);
  }

  @RequirePermissions("manager.agreements.settlements.create")
  @Post("credit-agreements/:id/settlements")
  createSettlement(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.createSettlement(user, id);
  }

  @RequirePermissions("manager.credit-approval-requests.read")
  @Get("credit-approval-requests/pending")
  listPendingApprovalRequests(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.listPendingApprovalRequests(user);
  }

  @RequirePermissions("manager.credit-approval-requests.approve")
  @Post("credit-approval-requests/:id/approve")
  approveOverLimitTrade(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ApproveOverLimitTradeDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.approveOverLimitTrade(user, id, dto);
  }

  @RequirePermissions("manager.credit-approval-requests.reject")
  @Post("credit-approval-requests/:id/reject")
  rejectOverLimitTrade(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RejectOverLimitTradeDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.rejectOverLimitTrade(user, id, dto);
  }
}
