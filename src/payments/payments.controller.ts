import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { PermissionsGuard, RequireAnyPermission } from "../auth/permissions";
import { CompletePaymentDto } from "./dto/complete-payment.dto";
import { CreatePaymentIntentDto } from "./dto/create-payment-intent.dto";
import { RefundPaymentDto } from "./dto/refund-payment.dto";
import { PaymentsService } from "./payments.service";
import * as Swagger from "./payments.swagger";

const paymentWritePermissions = [
  "seller.purchase-requests.confirm.own",
  "seller.purchase-requests.confirm.all",
] as const;
const paymentReadPermissions = [
  "seller.invoices.active.read.own",
  "seller.invoices.active.read.all",
  "seller.invoices.history.read.own",
  "seller.invoices.history.read.all",
] as const;
const paymentManagePermissions = ["manager.orders.manage"] as const;

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("business-accounts/:businessAccountId/payments")
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @RequireAnyPermission(...paymentWritePermissions)
  @Post("intents")
  @Swagger.CreateIntent()
  createIntent(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Req() req: Request,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.service.createIntent(
      businessAccountId,
      req.user as AuthenticatedUser,
      dto,
    );
  }

  @RequireAnyPermission(...paymentReadPermissions)
  @Get(":id")
  @Swagger.GetPayment()
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

  @RequireAnyPermission(...paymentWritePermissions)
  @Post(":id/complete")
  @Swagger.Complete()
  complete(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
    @Body() dto: CompletePaymentDto,
  ) {
    return this.service.complete(
      businessAccountId,
      id,
      req.user as AuthenticatedUser,
      dto,
    );
  }

  @RequireAnyPermission(...paymentManagePermissions)
  @Post(":id/refunds")
  @Swagger.Refund()
  refund(
    @Param("businessAccountId", ParseIntPipe) businessAccountId: number,
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.service.refund(
      businessAccountId,
      id,
      req.user as AuthenticatedUser,
      dto,
    );
  }
}
