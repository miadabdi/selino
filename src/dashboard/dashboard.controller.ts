import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import {
  PermissionsGuard,
  RequireAnyPermission,
} from "../auth/permissions/index.js";
import { DashboardService } from "./dashboard.service.js";
import { DashboardQueryDto } from "./dto/dashboard-query.dto.js";
import * as Swagger from "./dashboard.swagger.js";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("business-accounts/:businessAccountId/dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @RequireAnyPermission(
    "seller.dashboard.overview",
    "manager.dashboard.read",
    "manager.dashboard.overview",
  )
  @Get()
  @Swagger.Overview()
  getOverview(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getOverview(
      request.user as AuthenticatedUser,
      businessAccountId,
      query,
    );
  }
}
