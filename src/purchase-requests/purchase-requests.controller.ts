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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { AddPurchaseRequestItemDto } from "./dto/add-purchase-request-item.dto";
import { PurchaseRequestsService } from "./purchase-requests.service";

@ApiTags("Purchase Requests")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard)
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
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.removeItem(user, itemId);
  }

  @Get("active")
  getActive(@Req() req: Request) {
    const user = req.user as { id: number };
    return this.purchaseRequestsService.getActive(user.id);
  }

  @Post(":id/confirm")
  confirm(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.confirm(user, id);
  }

  @Post(":id/cancel")
  cancel(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const user = req.user as AuthenticatedUser;
    return this.purchaseRequestsService.cancel(user, id);
  }
}
