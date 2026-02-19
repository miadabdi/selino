import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { AddPurchaseRequestItemDto } from "./dto/add-purchase-request-item.dto.js";
import { PurchaseRequestsService } from "./purchase-requests.service.js";

@ApiTags("Purchase Requests")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("purchase-requests")
export class PurchaseRequestsController {
  constructor(
    private readonly purchaseRequestsService: PurchaseRequestsService,
  ) {}

  @Post("items")
  addItem(@Req() req: Request, @Body() dto: AddPurchaseRequestItemDto) {
    const user = req.user as { id: number };
    return this.purchaseRequestsService.addItem(user.id, dto);
  }

  @Delete("items/:itemId")
  removeItem(
    @Req() req: Request,
    @Param("itemId", ParseIntPipe) itemId: number,
  ) {
    const user = req.user as { id: number };
    return this.purchaseRequestsService.removeItem(user.id, itemId);
  }

  @Get("active")
  getActive(@Req() req: Request) {
    const user = req.user as { id: number };
    return this.purchaseRequestsService.getActive(user.id);
  }

  @Post(":id/confirm")
  confirm(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const user = req.user as { id: number };
    return this.purchaseRequestsService.confirm(user.id, id);
  }

  @Post(":id/cancel")
  cancel(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const user = req.user as { id: number };
    return this.purchaseRequestsService.cancel(user.id, id);
  }
}
