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
import { PermissionsGuard, RequirePermissions } from "../auth/permissions";
import { ApproveOverLimitTradeDto } from "./dto/approve-over-limit-trade.dto";
import { CreateTradeCreditAgreementDto } from "./dto/create-trade-credit-agreement.dto";
import { RejectOverLimitTradeDto } from "./dto/reject-over-limit-trade.dto";
import { ListCreditApprovalRequestsQueryDto } from "./dto/list-credit-approval-requests-query.dto";
import { SearchTradeOffersQueryDto } from "./dto/search-trade-offers-query.dto";
import { SuspendTradeCreditAgreementDto } from "./dto/suspend-trade-credit-agreement.dto";
import { TradeNetworkService } from "./trade-network.service";
import * as Swagger from "./trade-network.swagger";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("trade-network")
export class TradeNetworkController {
  constructor(private readonly tradeNetworkService: TradeNetworkService) {}

  @RequirePermissions("seller.inventory.read")
  @Get("offers/search")
  @Swagger.SearchOffers()
  searchOffers(@Req() req: Request, @Query() query: SearchTradeOffersQueryDto) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.searchOffers(user, query);
  }

  @RequirePermissions("manager.agreements.create")
  @Post("credit-agreements")
  @Swagger.CreateAgreement()
  createAgreement(
    @Req() req: Request,
    @Body() dto: CreateTradeCreditAgreementDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.createAgreement(user, dto);
  }

  @RequirePermissions("manager.agreements.sign")
  @Post("credit-agreements/:id/sign")
  @Swagger.SignAgreement()
  signAgreement(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.signAgreement(user, id);
  }

  @RequirePermissions("manager.agreements.activate")
  @Post("credit-agreements/:id/activate")
  @Swagger.ActivateAgreement()
  activateAgreement(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.activateAgreement(user, id);
  }

  @RequirePermissions("manager.agreements.suspend")
  @Post("credit-agreements/:id/suspend")
  @Swagger.SuspendAgreement()
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
  @Swagger.CreateSettlement()
  createSettlement(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.createSettlement(user, id);
  }

  @RequirePermissions("manager.credit-approval-requests.read")
  @Get("credit-approval-requests/pending")
  @Swagger.ListPendingApprovals()
  listPendingApprovalRequests(
    @Req() req: Request,
    @Query() query: ListCreditApprovalRequestsQueryDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.listPendingApprovalRequests(
      user,
      query.businessAccountId,
    );
  }

  @RequirePermissions("manager.credit-approval-requests.approve")
  @Post("credit-approval-requests/:id/approve")
  @Swagger.ApproveOverLimitTrade()
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
  @Swagger.RejectOverLimitTrade()
  rejectOverLimitTrade(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RejectOverLimitTradeDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.tradeNetworkService.rejectOverLimitTrade(user, id, dto);
  }
}
