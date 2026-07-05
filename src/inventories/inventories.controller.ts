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
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { RestockInventoryDto } from "./dto/restock-inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";
import { InventoriesService } from "./inventories.service";

@ApiTags("Business Account Inventories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard)
@Controller("business-accounts/:businessAccountId/inventory")
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  @Post()
  create(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Req() req: Request,
    @Body() dto: CreateInventoryDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.inventoriesService.create(businessAccountId, user, dto);
  }

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

  @Get()
  list(@Param("businessAccountId", ParseIntPipe) businessAccountId: number) {
    return this.inventoriesService.list(businessAccountId);
  }

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

  @Get(":id/transactions")
  listTransactions(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.inventoriesService.listTransactions(businessAccountId, id);
  }
}
