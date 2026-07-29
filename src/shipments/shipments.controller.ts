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
import { CreateShipmentDto } from "./dto/create-shipment.dto";
import { ListShipmentsQueryDto } from "./dto/list-shipments-query.dto";
import { RecordShipmentLocationDto } from "./dto/record-shipment-location.dto";
import { UpdateShipmentDto } from "./dto/update-shipment.dto";
import { ShipmentsService } from "./shipments.service";
import * as Swagger from "./shipments.swagger";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@RequirePermissions("manager.orders.track")
@Controller("business-accounts/:businessAccountId/shipments")
export class ShipmentsController {
  constructor(private readonly service: ShipmentsService) {}

  @Get()
  @Swagger.List()
  list(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Req() req: Request,
    @Query() query: ListShipmentsQueryDto,
  ) {
    return this.service.list(
      businessAccountId,
      req.user as AuthenticatedUser,
      query,
    );
  }

  @Get(":id")
  @Swagger.GetShipment()
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

  @Post()
  @Swagger.Create()
  create(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Req() req: Request,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.service.create(
      businessAccountId,
      req.user as AuthenticatedUser,
      dto,
    );
  }

  @Patch(":id")
  @Swagger.Update()
  update(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
    @Body() dto: UpdateShipmentDto,
  ) {
    return this.service.update(
      businessAccountId,
      id,
      req.user as AuthenticatedUser,
      dto,
    );
  }

  @Post(":id/locations")
  @Swagger.RecordLocation()
  recordLocation(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
    @Body() dto: RecordShipmentLocationDto,
  ) {
    return this.service.recordLocation(
      businessAccountId,
      id,
      req.user as AuthenticatedUser,
      dto,
    );
  }
}
