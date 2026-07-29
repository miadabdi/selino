import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto.js";
import { NotificationScopeQueryDto } from "./dto/notification-scope-query.dto.js";
import { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto.js";
import { NotificationService } from "./notification.service.js";
import * as Swagger from "./notification.swagger.js";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard)
@Controller("notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Swagger.List()
  list(@Req() request: Request, @Query() query: ListNotificationsQueryDto) {
    return this.notificationService.list(
      request.user as AuthenticatedUser,
      query,
    );
  }

  @Get("unread-count")
  @Swagger.UnreadCount()
  unreadCount(
    @Req() request: Request,
    @Query() query: NotificationScopeQueryDto,
  ) {
    return this.notificationService.getUnreadCount(
      request.user as AuthenticatedUser,
      query.businessAccountId,
    );
  }

  @Patch("read-all")
  @Swagger.MarkAllRead()
  markAllRead(
    @Req() request: Request,
    @Query() query: NotificationScopeQueryDto,
  ) {
    return this.notificationService.markAllRead(
      request.user as AuthenticatedUser,
      query.businessAccountId,
    );
  }

  @Patch(":id/read")
  @Swagger.MarkRead()
  markRead(
    @Req() request: Request,
    @Param("id", ParseIntPipe) id: number,
    @Query() query: NotificationScopeQueryDto,
  ) {
    return this.notificationService.markRead(
      request.user as AuthenticatedUser,
      id,
      query.businessAccountId,
    );
  }

  @Get("preferences/:businessAccountId")
  @Swagger.GetPreferences()
  getPreferences(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
  ) {
    return this.notificationService.getPreferences(
      request.user as AuthenticatedUser,
      businessAccountId,
    );
  }

  @Patch("preferences/:businessAccountId")
  @Swagger.UpdatePreferences()
  updatePreferences(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationService.updatePreferences(
      request.user as AuthenticatedUser,
      businessAccountId,
      dto,
    );
  }
}
