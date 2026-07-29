import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import {
  assertBusinessPermission,
  findMembershipWithPermission,
  resolveBusinessAccountIdForPermission,
} from "../auth/permissions";
import { throwHttpError } from "../common/http-error";
import type { TXContext } from "../database/database.types";
import { InventoriesRepository } from "../inventories/inventories.repository";
import { StoreInventoryTransactionsRepository } from "../inventories/store-inventory-transactions.repository";
import type { ApproveOverLimitTradeDto } from "./dto/approve-over-limit-trade.dto";
import type { CreateTradeCreditAgreementDto } from "./dto/create-trade-credit-agreement.dto";
import type { RejectOverLimitTradeDto } from "./dto/reject-over-limit-trade.dto";
import type { SearchTradeOffersQueryDto } from "./dto/search-trade-offers-query.dto";
import type { SuspendTradeCreditAgreementDto } from "./dto/suspend-trade-credit-agreement.dto";
import { TradeNetworkRepository } from "./trade-network.repository";

@Injectable()
export class TradeNetworkService {
  constructor(
    private readonly repository: TradeNetworkRepository,
    private readonly inventoriesRepository: InventoriesRepository,
    private readonly storeInventoryTransactionsRepository: StoreInventoryTransactionsRepository,
  ) {}

  private resolveBuyerBusinessAccountId(
    user: AuthenticatedUser,
    permission: string,
  ) {
    const businessAccountId = resolveBusinessAccountIdForPermission(
      user,
      permission,
    );

    if (businessAccountId == null) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "Active business membership is required",
      );
    }

    return businessAccountId;
  }

  async searchOffers(
    user: AuthenticatedUser,
    query: SearchTradeOffersQueryDto,
  ) {
    const buyerBusinessAccountId = this.resolveBuyerBusinessAccountId(
      user,
      "seller.inventory.read",
    );

    return this.repository.searchOffers(buyerBusinessAccountId, query);
  }

  async createAgreement(
    user: AuthenticatedUser,
    dto: CreateTradeCreditAgreementDto,
  ) {
    if (dto.buyerBusinessAccountId === dto.supplierBusinessAccountId) {
      throwHttpError(
        HttpStatus.BAD_REQUEST,
        "Buyer and supplier business accounts must be different",
      );
    }

    assertBusinessPermission(
      user,
      dto.buyerBusinessAccountId,
      "manager.agreements.create",
    );

    return this.repository.transaction(async (tx) => {
      const agreement = await this.repository.createAgreement(
        {
          buyerBusinessAccountId: dto.buyerBusinessAccountId,
          supplierBusinessAccountId: dto.supplierBusinessAccountId,
          label: dto.label ?? null,
          description: dto.description ?? null,
          creditLimit: dto.creditLimit,
          currency: dto.currency ?? "IRR",
          settlementCycle: dto.settlementCycle ?? "monthly",
          settlementDayOfMonth: dto.settlementDayOfMonth ?? null,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          status: "pending_signatures",
          isActive: false,
          createdBy: user.id,
        },
        tx,
      );

      await this.repository.createAuditLog(
        {
          agreementId: agreement.id,
          action: "created",
          actorUserId: user.id,
          actorBusinessAccountId: dto.buyerBusinessAccountId,
          after: agreement,
        },
        tx,
      );

      return agreement;
    });
  }

  async signAgreement(user: AuthenticatedUser, agreementId: number) {
    const agreement = await this.repository.findAgreementById(agreementId);
    if (!agreement) {
      throwHttpError(HttpStatus.NOT_FOUND, "Trade credit agreement not found");
    }

    const membership = findMembershipWithPermission(
      user,
      "manager.agreements.sign",
    );
    const canSignForBuyer =
      user.isAdmin === true ||
      user.permissions.includes("*") ||
      membership?.businessAccountId === agreement.buyerBusinessAccountId;
    const canSignForSupplier =
      user.isAdmin === true ||
      user.permissions.includes("*") ||
      membership?.businessAccountId === agreement.supplierBusinessAccountId;

    if (!canSignForBuyer && !canSignForSupplier) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "Only agreement parties can sign this agreement",
      );
    }

    const party = canSignForSupplier && !canSignForBuyer ? "supplier" : "buyer";
    const businessAccountId =
      party === "buyer"
        ? agreement.buyerBusinessAccountId
        : agreement.supplierBusinessAccountId;

    return this.repository.transaction(async (tx) => {
      const signedAt = new Date();
      const signature = await this.repository.createSignature(
        {
          agreementId,
          party,
          businessAccountId,
          signedBy: user.id,
          signedAt,
        },
        tx,
      );

      if (party === "buyer") {
        await this.repository.markBuyerSigned(agreementId, signedAt, tx);
      } else {
        await this.repository.markSupplierSigned(agreementId, signedAt, tx);
      }

      await this.repository.createAuditLog(
        {
          agreementId,
          action: "signed",
          actorUserId: user.id,
          actorBusinessAccountId: businessAccountId,
          after: signature,
        },
        tx,
      );

      return signature;
    });
  }

  async activateAgreement(user: AuthenticatedUser, agreementId: number) {
    const agreement = await this.repository.findAgreementById(agreementId);
    if (!agreement) {
      throwHttpError(HttpStatus.NOT_FOUND, "Trade credit agreement not found");
    }

    assertBusinessPermission(
      user,
      agreement.buyerBusinessAccountId,
      "manager.agreements.activate",
    );

    if (!agreement.buyerSignedAt || !agreement.supplierSignedAt) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "Both buyer and supplier must sign before activation",
      );
    }

    return this.repository.transaction(async (tx) => {
      const updated = await this.repository.setAgreementStatus(
        agreementId,
        { status: "active", isActive: true },
        tx,
      );

      await this.repository.createAuditLog(
        {
          agreementId,
          action: "activated",
          actorUserId: user.id,
          actorBusinessAccountId: agreement.buyerBusinessAccountId,
          before: agreement,
          after: updated,
        },
        tx,
      );

      return updated;
    });
  }

  async suspendAgreement(
    user: AuthenticatedUser,
    agreementId: number,
    dto: SuspendTradeCreditAgreementDto,
  ) {
    const agreement = await this.repository.findAgreementById(agreementId);
    if (!agreement) {
      throwHttpError(HttpStatus.NOT_FOUND, "Trade credit agreement not found");
    }

    assertBusinessPermission(
      user,
      agreement.buyerBusinessAccountId,
      "manager.agreements.suspend",
    );

    return this.repository.transaction(async (tx) => {
      const updated = await this.repository.setAgreementStatus(
        agreementId,
        {
          status: "suspended",
          isActive: false,
          suspendedAt: new Date(),
          suspensionReason: dto.reason,
        },
        tx,
      );

      await this.repository.createAuditLog(
        {
          agreementId,
          action: "suspended",
          actorUserId: user.id,
          actorBusinessAccountId: agreement.buyerBusinessAccountId,
          before: agreement,
          after: updated,
        },
        tx,
      );

      return updated;
    });
  }

  async recordCreditPurchase(
    user: AuthenticatedUser,
    buyerBusinessAccountId: number,
    supplierBusinessAccountId: number,
    amount: number,
    referenceType: string,
    referenceId: number,
    tx: TXContext,
  ) {
    const agreement = await this.repository.findActiveAgreementForBuyerSupplier(
      buyerBusinessAccountId,
      supplierBusinessAccountId,
      tx,
    );

    if (!agreement) {
      return null;
    }

    const updatedAgreement = await this.repository.consumeCredit(
      agreement.id,
      amount,
      tx,
    );

    if (!updatedAgreement) {
      throwHttpError(HttpStatus.CONFLICT, "Trade credit limit exceeded");
    }

    const transaction = await this.repository.createTransaction(
      {
        agreementId: agreement.id,
        type: "purchase",
        amount,
        currency: agreement.currency,
        referenceType,
        referenceId,
        description: "Credit purchase confirmed",
        createdBy: user.id,
      },
      tx,
    );

    await this.repository.createAuditLog(
      {
        agreementId: agreement.id,
        action: "transaction_created",
        actorUserId: user.id,
        actorBusinessAccountId: buyerBusinessAccountId,
        after: transaction,
      },
      tx,
    );

    return transaction;
  }

  async prepareCreditPurchase(
    user: AuthenticatedUser,
    buyerBusinessAccountId: number,
    supplierBusinessAccountId: number,
    amount: number,
    purchaseRequestId: number,
    tx: TXContext,
  ) {
    const agreement = await this.repository.findActiveAgreementForBuyerSupplier(
      buyerBusinessAccountId,
      supplierBusinessAccountId,
      tx,
    );

    if (!agreement) {
      return { status: "approved_without_agreement" as const };
    }

    const projectedDebt = agreement.usedCredit + amount;
    if (projectedDebt <= agreement.creditLimit) {
      return { status: "approved_within_limit" as const, agreement };
    }

    const existing =
      await this.repository.findPendingApprovalByPurchaseRequestId(
        purchaseRequestId,
        tx,
      );

    if (existing) {
      return { status: "pending_approval" as const, approvalRequest: existing };
    }

    const approvalRequest = await this.repository.createApprovalRequest(
      {
        agreementId: agreement.id,
        purchaseRequestId,
        requestedBy: user.id,
        ownerBusinessAccountId: agreement.buyerBusinessAccountId,
        requestedAmount: amount,
        debtLimit: agreement.creditLimit,
        currentDebt: agreement.usedCredit,
        projectedDebt,
        overLimitAmount: projectedDebt - agreement.creditLimit,
        currency: agreement.currency,
        status: "pending",
      },
      tx,
    );

    await this.repository.createAuditLog(
      {
        agreementId: agreement.id,
        action: "over_limit_requested",
        actorUserId: user.id,
        actorBusinessAccountId: buyerBusinessAccountId,
        after: approvalRequest,
      },
      tx,
    );

    return { status: "pending_approval" as const, approvalRequest };
  }

  async listPendingApprovalRequests(user: AuthenticatedUser) {
    const ownerBusinessAccountId = this.resolveBuyerBusinessAccountId(
      user,
      "manager.credit-approval-requests.read",
    );
    return this.repository.listPendingApprovalRequestsForOwner(
      ownerBusinessAccountId,
    );
  }

  async approveOverLimitTrade(
    user: AuthenticatedUser,
    approvalRequestId: number,
    dto: ApproveOverLimitTradeDto,
  ) {
    const approvalRequest =
      await this.repository.findApprovalRequestById(approvalRequestId);

    if (!approvalRequest) {
      throwHttpError(HttpStatus.NOT_FOUND, "Credit approval request not found");
    }

    if (approvalRequest.status !== "pending") {
      throwHttpError(HttpStatus.CONFLICT, "Credit approval request is closed");
    }

    assertBusinessPermission(
      user,
      approvalRequest.ownerBusinessAccountId,
      "manager.credit-approval-requests.approve",
    );

    const request = approvalRequest.purchaseRequest;
    if (!request || request.status !== "pending_credit_approval") {
      throwHttpError(
        HttpStatus.CONFLICT,
        "Purchase request is not pending credit approval",
      );
    }

    return this.repository.transaction(async (tx) => {
      const approved = await this.repository.approveApprovalRequest(
        approvalRequest.id,
        user.id,
        dto.note ?? null,
        tx,
      );

      if (!approved) {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Credit approval request is closed",
        );
      }

      const invoice = await this.repository.createInvoiceFromPurchaseRequest(
        request.id,
        request.requesterId,
        tx,
      );

      if (!invoice) {
        throwHttpError(HttpStatus.NOT_FOUND, "Purchase request not found");
      }

      for (const item of request.items) {
        if (item.storeInventoryId == null) {
          throwHttpError(HttpStatus.CONFLICT, "Inventory linkage missing");
        }

        const consumed = await this.inventoriesRepository.consumeReservedStock(
          item.storeInventoryId,
          item.qty,
          tx,
        );

        if (consumed.length === 0) {
          throwHttpError(HttpStatus.CONFLICT, "Insufficient stock for sale");
        }

        await this.storeInventoryTransactionsRepository.create(
          item.storeInventoryId,
          -item.qty,
          "sale",
          `invoice:${invoice.id}`,
          user.id,
          tx,
        );
      }

      await this.repository.increaseDebt(
        approvalRequest.agreementId,
        approvalRequest.requestedAmount,
        tx,
      );

      const transaction = await this.repository.createTransaction(
        {
          agreementId: approvalRequest.agreementId,
          type: "purchase",
          amount: approvalRequest.requestedAmount,
          currency: approvalRequest.currency,
          referenceType: "invoice",
          referenceId: invoice.id,
          description: "Over-limit credit purchase approved",
          createdBy: user.id,
        },
        tx,
      );

      await this.repository.createAuditLog(
        {
          agreementId: approvalRequest.agreementId,
          action: "over_limit_approved",
          actorUserId: user.id,
          actorBusinessAccountId: approvalRequest.ownerBusinessAccountId,
          before: approvalRequest,
          after: { approved, invoice, transaction },
        },
        tx,
      );

      return { approvalRequest: approved, invoice };
    });
  }

  async rejectOverLimitTrade(
    user: AuthenticatedUser,
    approvalRequestId: number,
    dto: RejectOverLimitTradeDto,
  ) {
    const approvalRequest =
      await this.repository.findApprovalRequestById(approvalRequestId);

    if (!approvalRequest) {
      throwHttpError(HttpStatus.NOT_FOUND, "Credit approval request not found");
    }

    if (approvalRequest.status !== "pending") {
      throwHttpError(HttpStatus.CONFLICT, "Credit approval request is closed");
    }

    assertBusinessPermission(
      user,
      approvalRequest.ownerBusinessAccountId,
      "manager.credit-approval-requests.reject",
    );

    const request = approvalRequest.purchaseRequest;
    if (!request) {
      throwHttpError(HttpStatus.NOT_FOUND, "Purchase request not found");
    }

    return this.repository.transaction(async (tx) => {
      const rejected = await this.repository.rejectApprovalRequest(
        approvalRequest.id,
        user.id,
        dto.note ?? null,
        tx,
      );

      if (!rejected) {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Credit approval request is closed",
        );
      }

      for (const item of request.items) {
        if (item.storeInventoryId == null) {
          continue;
        }

        const released = await this.inventoriesRepository.releaseReservedStock(
          item.storeInventoryId,
          item.qty,
          tx,
        );

        if (released.length === 0) {
          throwHttpError(HttpStatus.CONFLICT, "Stock reservation conflict");
        }
      }

      await this.repository.setPurchaseRequestCancelled(request.id, tx);

      await this.repository.createAuditLog(
        {
          agreementId: approvalRequest.agreementId,
          action: "over_limit_rejected",
          actorUserId: user.id,
          actorBusinessAccountId: approvalRequest.ownerBusinessAccountId,
          before: approvalRequest,
          after: rejected,
        },
        tx,
      );

      return rejected;
    });
  }

  async createSettlement(user: AuthenticatedUser, agreementId: number) {
    const agreement = await this.repository.findAgreementById(agreementId);
    if (!agreement) {
      throwHttpError(HttpStatus.NOT_FOUND, "Trade credit agreement not found");
    }

    assertBusinessPermission(
      user,
      agreement.buyerBusinessAccountId,
      "manager.agreements.settlements.create",
    );

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return this.repository.transaction(async (tx) => {
      const settlement = await this.repository.createSettlement(
        {
          agreementId,
          periodStart,
          periodEnd,
          openingBalance: agreement.usedCredit,
          netAmount: agreement.usedCredit,
          closingBalance: agreement.usedCredit,
          currency: agreement.currency,
          status: "pending",
        },
        tx,
      );

      await this.repository.createAuditLog(
        {
          agreementId,
          action: "settlement_created",
          actorUserId: user.id,
          actorBusinessAccountId: agreement.buyerBusinessAccountId,
          after: settlement,
        },
        tx,
      );

      return settlement;
    });
  }
}
