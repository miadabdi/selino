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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CreateInventoryDto } from "./dto/create-inventory.dto.js";
import { RestockInventoryDto } from "./dto/restock-inventory.dto.js";
import { UpdateInventoryDto } from "./dto/update-inventory.dto.js";
import { InventoriesService } from "./inventories.service.js";

@ApiTags("Store Inventories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("stores/:storeId/inventory")
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  @Post()
  create(
    @Param("storeId", ParseIntPipe) storeId: number,
    @Req() req: Request,
    @Body() dto: CreateInventoryDto,
  ) {
    const user = req.user as { id: number };
    return this.inventoriesService.create(storeId, user.id, dto);
  }

  @Patch(":id/restock")
  restock(
    @Param("storeId", ParseIntPipe) storeId: number,
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
    @Body() dto: RestockInventoryDto,
  ) {
    const user = req.user as { id: number };
    return this.inventoriesService.restock(storeId, id, user.id, dto);
  }

  @Get()
  list(@Param("storeId", ParseIntPipe) storeId: number) {
    return this.inventoriesService.list(storeId);
  }

  @Patch(":id")
  update(
    @Param("storeId", ParseIntPipe) storeId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.inventoriesService.update(storeId, id, dto);
  }

  @Get(":id/transactions")
  listTransactions(
    @Param("storeId", ParseIntPipe) storeId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.inventoriesService.listTransactions(storeId, id);
  }
}
