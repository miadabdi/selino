import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { throwHttpError } from "../common/http-error";
import { WalletsService } from "../wallets/wallets.service";
import { OrdersRepository } from "../orders/orders.repository";
import type { CompletePaymentDto } from "./dto/complete-payment.dto";
import type { CreatePaymentIntentDto } from "./dto/create-payment-intent.dto";
import type { RefundPaymentDto } from "./dto/refund-payment.dto";
import { PaymentsRepository } from "./payments.repository";

const PAYMENT_WRITE_PERMISSIONS = [
  "seller.purchase-requests.confirm.own",
  "seller.purchase-requests.confirm.all",
] as const;
const PAYMENT_READ_PERMISSIONS = [
  "seller.invoices.active.read.own",
  "seller.invoices.active.read.all",
  "seller.invoices.history.read.own",
  "seller.invoices.history.read.all",
] as const;
const PAYMENT_REFUND_PERMISSIONS = ["manager.orders.manage"] as const;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly walletsService: WalletsService,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async createIntent(
    businessAccountId: number,
    user: AuthenticatedUser,
    dto: CreatePaymentIntentDto,
  ) {
    this.assertBusinessAccess(
      user,
      businessAccountId,
      PAYMENT_WRITE_PERMISSIONS,
    );
    const invoice = await this.repository.findInvoiceForBuyer(
      businessAccountId,
      dto.invoiceId,
    );
    if (!invoice) {
      throwHttpError(HttpStatus.NOT_FOUND, "Invoice not found");
    }
    this.assertOwnOrAll(
      user,
      businessAccountId,
      invoice.buyerId,
      "seller.purchase-requests.confirm.own",
      "seller.purchase-requests.confirm.all",
    );
    if (!["pending", "sent", "delivered"].includes(invoice.status)) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "Invoice is not payable in its current status",
      );
    }
    if (dto.fundingSource === "external" && !dto.provider) {
      throwHttpError(
        HttpStatus.BAD_REQUEST,
        "External payment provider is required",
        "provider",
      );
    }

    const existing = await this.repository.findByIdempotencyKey(
      businessAccountId,
      dto.idempotencyKey,
    );
    if (existing) {
      if (
        existing.invoiceId !== dto.invoiceId ||
        existing.method !==
          (dto.fundingSource === "wallet" ? "wallet" : "gateway")
      ) {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Idempotency key belongs to another payment intent",
        );
      }
      return existing;
    }

    const wallet =
      dto.fundingSource === "wallet"
        ? await this.walletsService.ensureWallet(
            businessAccountId,
            invoice.currency,
          )
        : null;
    if (dto.fundingSource === "wallet" && !wallet) {
      throwHttpError(HttpStatus.CONFLICT, "Wallet could not be created");
    }

    return this.repository.create({
      businessAccountId,
      invoiceId: invoice.id,
      walletId: wallet?.id ?? null,
      amount: invoice.totalAmount,
      currency: invoice.currency,
      method: dto.fundingSource === "wallet" ? "wallet" : "gateway",
      provider:
        dto.fundingSource === "wallet" ? "wallet" : (dto.provider as string),
      idempotencyKey: dto.idempotencyKey,
      createdBy: user.id,
    });
  }

  async get(
    businessAccountId: number,
    paymentId: number,
    user: AuthenticatedUser,
  ) {
    this.assertBusinessAccess(
      user,
      businessAccountId,
      PAYMENT_READ_PERMISSIONS,
    );
    const payment = await this.repository.findForBusiness(
      businessAccountId,
      paymentId,
    );
    if (!payment) {
      throwHttpError(HttpStatus.NOT_FOUND, "Payment not found");
    }
    const invoice = await this.repository.findInvoiceForBuyer(
      businessAccountId,
      payment.invoiceId,
    );
    if (!invoice) {
      throwHttpError(HttpStatus.NOT_FOUND, "Invoice not found");
    }
    const view = ["pending_credit_approval", "pending", "sent"].includes(
      invoice.status,
    )
      ? "active"
      : "history";
    this.assertOwnOrAll(
      user,
      businessAccountId,
      invoice.buyerId,
      `seller.invoices.${view}.read.own`,
      `seller.invoices.${view}.read.all`,
    );
    return payment;
  }

  async complete(
    businessAccountId: number,
    paymentId: number,
    user: AuthenticatedUser,
    dto: CompletePaymentDto,
  ) {
    this.assertBusinessAccess(
      user,
      businessAccountId,
      PAYMENT_WRITE_PERMISSIONS,
    );
    return this.repository.transaction(async (tx) => {
      const payment = await this.repository.findForBusinessForUpdate(
        businessAccountId,
        paymentId,
        tx,
      );
      if (!payment) {
        throwHttpError(HttpStatus.NOT_FOUND, "Payment not found");
      }

      const invoice = await this.repository.findInvoiceForBuyerForUpdate(
        businessAccountId,
        payment.invoiceId,
        tx,
      );
      if (!invoice) {
        throwHttpError(HttpStatus.NOT_FOUND, "Invoice not found");
      }
      this.assertOwnOrAll(
        user,
        businessAccountId,
        invoice.buyerId,
        "seller.purchase-requests.confirm.own",
        "seller.purchase-requests.confirm.all",
      );
      if (
        ["succeeded", "partially_refunded", "refunded"].includes(payment.status)
      ) {
        return payment;
      }
      if (payment.status !== "pending") {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Payment cannot be completed in its current status",
        );
      }
      if (payment.method !== "wallet" && !dto.providerReference) {
        throwHttpError(
          HttpStatus.BAD_REQUEST,
          "External provider reference is required",
          "providerReference",
        );
      }
      if (!["pending", "sent", "delivered"].includes(invoice.status)) {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Invoice is not payable in its current status",
        );
      }
      const order = await this.ordersRepository.createFromInvoice(
        invoice,
        user.id,
        tx,
      );
      if (!order) {
        throwHttpError(HttpStatus.CONFLICT, "Order could not be created");
      }

      if (payment.method === "wallet") {
        await this.walletsService.applyLedgerEntry(
          businessAccountId,
          -payment.amount,
          {
            type: "payment",
            referenceType: "payment",
            referenceId: String(payment.id),
            idempotencyKey: `payment:${payment.id}:buyer-debit`,
            description: `Payment for invoice ${invoice.invoiceNumber}`,
            createdBy: user.id,
          },
          tx,
          payment.currency,
        );
      }
      await this.walletsService.applyLedgerEntry(
        invoice.supplierBusinessAccountId,
        payment.amount,
        {
          type: "payment",
          referenceType: "payment",
          referenceId: String(payment.id),
          idempotencyKey: `payment:${payment.id}:supplier-credit`,
          description: `Payment for invoice ${invoice.invoiceNumber}`,
          createdBy: user.id,
        },
        tx,
        payment.currency,
      );

      const paidInvoice = await this.repository.markInvoicePaid(
        invoice.id,
        invoice.status,
        user.id,
        tx,
      );
      if (!paidInvoice) {
        throwHttpError(HttpStatus.CONFLICT, "Invoice payment conflict");
      }
      const completed = await this.repository.markCompleted(
        payment.id,
        dto.providerReference ?? null,
        tx,
      );
      if (!completed) {
        throwHttpError(HttpStatus.CONFLICT, "Payment completion conflict");
      }
      return completed;
    });
  }

  async refund(
    businessAccountId: number,
    paymentId: number,
    user: AuthenticatedUser,
    dto: RefundPaymentDto,
  ) {
    this.assertBusinessAccess(
      user,
      businessAccountId,
      PAYMENT_REFUND_PERMISSIONS,
    );
    return this.repository.transaction(async (tx) => {
      const payment = await this.repository.findForBusinessForUpdate(
        businessAccountId,
        paymentId,
        tx,
      );
      if (!payment) {
        throwHttpError(HttpStatus.NOT_FOUND, "Payment not found");
      }
      if (!["succeeded", "partially_refunded"].includes(payment.status)) {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Payment cannot be refunded in its current status",
        );
      }
      const remaining = payment.amount - payment.refundedAmount;
      if (dto.amount > remaining) {
        throwHttpError(
          HttpStatus.BAD_REQUEST,
          "Refund exceeds the remaining paid amount",
          "amount",
        );
      }
      const invoice = await this.repository.findInvoiceForBuyerForUpdate(
        businessAccountId,
        payment.invoiceId,
        tx,
      );
      if (!invoice) {
        throwHttpError(HttpStatus.NOT_FOUND, "Invoice not found");
      }

      const supplierDebit = await this.walletsService.applyLedgerEntry(
        invoice.supplierBusinessAccountId,
        -dto.amount,
        {
          type: "refund",
          referenceType: "payment_refund",
          referenceId: String(payment.id),
          idempotencyKey: `${dto.idempotencyKey}:supplier`,
          description: dto.reason,
          createdBy: user.id,
        },
        tx,
        payment.currency,
      );
      const buyerCredit = await this.walletsService.applyLedgerEntry(
        businessAccountId,
        dto.amount,
        {
          type: "refund",
          referenceType: "payment_refund",
          referenceId: String(payment.id),
          idempotencyKey: `${dto.idempotencyKey}:buyer`,
          description: dto.reason,
          createdBy: user.id,
        },
        tx,
        payment.currency,
      );
      if (supplierDebit.idempotent && buyerCredit.idempotent) {
        return payment;
      }
      if (supplierDebit.idempotent !== buyerCredit.idempotent) {
        throwHttpError(HttpStatus.CONFLICT, "Partial refund ledger conflict");
      }

      return this.repository.addRefund(
        payment.id,
        dto.amount,
        dto.amount === remaining,
        {
          ...(payment.metadata ?? {}),
          lastRefundProviderReference: dto.providerReference ?? null,
          lastRefundReason: dto.reason ?? null,
          lastRefundIdempotencyKey: dto.idempotencyKey,
        },
        tx,
      );
    });
  }

  private assertBusinessAccess(
    user: AuthenticatedUser,
    businessAccountId: number,
    permissions: readonly string[],
  ) {
    if (user.isAdmin === true || user.permissions.includes("*")) return;
    const membership = user.businessMemberships.find(
      (item) =>
        item.isActive &&
        item.businessAccountId === businessAccountId &&
        permissions.some((permission) => item.permissions.includes(permission)),
    );
    if (!membership) {
      throwHttpError(HttpStatus.FORBIDDEN, "Payment permission is required");
    }
  }

  private assertOwnOrAll(
    user: AuthenticatedUser,
    businessAccountId: number,
    ownerUserId: number,
    ownPermission: string,
    allPermission: string,
  ) {
    if (user.isAdmin === true || user.permissions.includes("*")) return;
    const membership = user.businessMemberships.find(
      (item) => item.isActive && item.businessAccountId === businessAccountId,
    );
    if (
      membership?.permissions.includes(allPermission) ||
      (ownerUserId === user.id &&
        membership?.permissions.includes(ownPermission))
    ) {
      return;
    }
    throwHttpError(HttpStatus.FORBIDDEN, "Payment permission is required");
  }
}
