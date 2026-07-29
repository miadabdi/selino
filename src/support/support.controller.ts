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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import {
  PermissionsGuard,
  RequirePermissions,
} from "../auth/permissions/index.js";
import { CreateTicketDto } from "./dto/create-ticket.dto.js";
import { CreateTicketMessageDto } from "./dto/create-ticket-message.dto.js";
import { ListTicketsQueryDto } from "./dto/list-tickets-query.dto.js";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto.js";
import { SupportService } from "./support.service.js";
import * as Swagger from "./support.swagger.js";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("business-accounts/:businessAccountId/support/tickets")
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @RequirePermissions("manager.support.read")
  @Get()
  @Swagger.List()
  list(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Query() query: ListTicketsQueryDto,
  ) {
    return this.supportService.list(
      request.user as AuthenticatedUser,
      businessAccountId,
      query,
    );
  }

  @RequirePermissions("manager.support.read")
  @Get(":id")
  @Swagger.Get()
  get(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.supportService.get(
      request.user as AuthenticatedUser,
      businessAccountId,
      id,
    );
  }

  @RequirePermissions("manager.support.create")
  @Post()
  @Swagger.Create()
  create(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Body() dto: CreateTicketDto,
  ) {
    return this.supportService.create(
      request.user as AuthenticatedUser,
      businessAccountId,
      dto,
    );
  }

  @RequirePermissions("manager.support.reply")
  @Post(":id/messages")
  @Swagger.AddMessage()
  addMessage(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateTicketMessageDto,
  ) {
    return this.supportService.addMessage(
      request.user as AuthenticatedUser,
      businessAccountId,
      id,
      dto,
    );
  }

  @RequirePermissions("manager.support.update")
  @Patch(":id/status")
  @Swagger.UpdateStatus()
  updateStatus(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.supportService.updateStatus(
      request.user as AuthenticatedUser,
      businessAccountId,
      id,
      dto,
    );
  }
}
