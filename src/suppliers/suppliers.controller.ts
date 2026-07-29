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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import {
  PermissionsGuard,
  RequirePermissions,
} from "../auth/permissions/index.js";
import { CreateSupplierLinkDto } from "./dto/create-supplier-link.dto.js";
import { ListSuppliersQueryDto } from "./dto/list-suppliers-query.dto.js";
import { UpdateSupplierLinkDto } from "./dto/update-supplier-link.dto.js";
import { SuppliersService } from "./suppliers.service.js";
import * as Swagger from "./suppliers.swagger.js";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("business-accounts/:businessAccountId/suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @RequirePermissions("manager.suppliers.read")
  @Get()
  @Swagger.List()
  list(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Query() query: ListSuppliersQueryDto,
  ) {
    return this.suppliersService.list(
      request.user as AuthenticatedUser,
      businessAccountId,
      query,
    );
  }

  @RequirePermissions("manager.suppliers.read")
  @Get(":id")
  @Swagger.Get()
  get(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.suppliersService.get(
      request.user as AuthenticatedUser,
      businessAccountId,
      id,
    );
  }

  @RequirePermissions("manager.suppliers.create")
  @Post()
  @Swagger.Create()
  create(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Body() dto: CreateSupplierLinkDto,
  ) {
    return this.suppliersService.create(
      request.user as AuthenticatedUser,
      businessAccountId,
      dto,
    );
  }

  @RequirePermissions("manager.suppliers.update")
  @Patch(":id")
  @Swagger.Update()
  update(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierLinkDto,
  ) {
    return this.suppliersService.update(
      request.user as AuthenticatedUser,
      businessAccountId,
      id,
      dto,
    );
  }

  @RequirePermissions("manager.suppliers.delete")
  @Delete(":id")
  @Swagger.Remove()
  remove(
    @Req() request: Request,
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.suppliersService.remove(
      request.user as AuthenticatedUser,
      businessAccountId,
      id,
    );
  }
}
