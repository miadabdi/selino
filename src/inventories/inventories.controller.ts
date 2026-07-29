import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { PermissionsGuard, RequirePermissions } from "../auth/permissions";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { RestockInventoryDto } from "./dto/restock-inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";
import { InventoriesService } from "./inventories.service";

@ApiTags("Business Account Inventories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("business-accounts/:businessAccountId/inventory")
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  @RequirePermissions("seller.inventory.create")
  @Post()
  create(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Req() req: Request,
    @Body() dto: CreateInventoryDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.inventoriesService.create(businessAccountId, user, dto);
  }

  @RequirePermissions("seller.inventory.restock")
  @Patch(":id/restock")
  restock(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
    @Body() dto: RestockInventoryDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.inventoriesService.restock(businessAccountId, id, user, dto);
  }

  @RequirePermissions("seller.inventory.read")
  @Get()
  list(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.inventoriesService.list(businessAccountId, user);
  }

  @RequirePermissions("seller.inventory.update")
  @Patch(":id")
  update(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
    @Body() dto: UpdateInventoryDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.inventoriesService.update(businessAccountId, id, user, dto);
  }

  @RequirePermissions("seller.inventory.transactions.read")
  @Get(":id/transactions")
  listTransactions(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.inventoriesService.listTransactions(
      businessAccountId,
      id,
      user,
    );
  }
}
