import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { assertBusinessPermission } from "../auth/permissions";
import { throwHttpError } from "../common/http-error";
import type { TXContext } from "../database/database.types";
import type { AdjustWalletDto } from "./dto/adjust-wallet.dto";
import type { ListWalletTransactionsQueryDto } from "./dto/list-wallet-transactions-query.dto";
import {
  WalletsRepository,
  type WalletLedgerEntry,
} from "./wallets.repository";

@Injectable()
export class WalletsService {
  constructor(private readonly repository: WalletsRepository) {}

  async get(
    businessAccountId: number,
    user: AuthenticatedUser,
    currency = "IRR",
  ) {
    this.assertReadAccess(user, businessAccountId);
    return this.ensureWallet(businessAccountId, currency);
  }

  async listTransactions(
    businessAccountId: number,
    user: AuthenticatedUser,
    query: ListWalletTransactionsQueryDto,
  ) {
    this.assertReadAccess(user, businessAccountId);
    const wallet = await this.ensureWallet(businessAccountId);
    return this.repository.listTransactions(wallet.id, query);
  }

  async adjust(
    businessAccountId: number,
    user: AuthenticatedUser,
    dto: AdjustWalletDto,
  ) {
    assertBusinessPermission(user, businessAccountId, "manager.credit.manage");
    const signedAmount = dto.direction === "credit" ? dto.amount : -dto.amount;

    return this.repository.transaction(async (tx) =>
      this.applyLedgerEntry(
        businessAccountId,
        signedAmount,
        {
          type: "adjustment",
          referenceType: "manual_adjustment",
          idempotencyKey: dto.reference,
          description: dto.description,
          createdBy: user.id,
        },
        tx,
      ),
    );
  }

  async applyLedgerEntry(
    businessAccountId: number,
    signedAmount: number,
    entry: Omit<
      WalletLedgerEntry,
      | "walletId"
      | "amount"
      | "direction"
      | "balanceBefore"
      | "balanceAfter"
      | "currency"
    >,
    txContext: TXContext,
    currency = "IRR",
  ) {
    let wallet = await this.repository.findByBusinessAccountForUpdate(
      businessAccountId,
      currency,
      txContext,
    );
    wallet ??= await this.repository.create(
      businessAccountId,
      currency,
      txContext,
    );
    if (!wallet) {
      throwHttpError(HttpStatus.CONFLICT, "Wallet could not be created");
    }
    if (wallet.status !== "active") {
      throwHttpError(HttpStatus.CONFLICT, "Wallet is not active");
    }

    const existing = await this.repository.findTransactionByIdempotencyKey(
      wallet.id,
      entry.idempotencyKey,
      txContext,
    );
    if (existing) {
      return { wallet, transaction: existing, idempotent: true };
    }

    const updated = await this.repository.changeBalance(
      wallet.id,
      signedAmount,
      txContext,
    );
    if (!updated) {
      throwHttpError(HttpStatus.CONFLICT, "Insufficient wallet balance");
    }

    const transaction = await this.repository.createTransaction(
      {
        ...entry,
        walletId: wallet.id,
        amount: Math.abs(signedAmount),
        direction: signedAmount >= 0 ? "credit" : "debit",
        balanceBefore: wallet.balance,
        balanceAfter: updated.balance,
        currency,
        referenceId:
          entry.referenceId == null ? null : String(entry.referenceId),
      },
      txContext,
    );
    return { wallet: updated, transaction, idempotent: false };
  }

  async ensureWallet(businessAccountId: number, currency = "IRR") {
    return (
      (await this.repository.findByBusinessAccount(
        businessAccountId,
        currency,
      )) ?? this.repository.create(businessAccountId, currency)
    );
  }

  private assertReadAccess(user: AuthenticatedUser, businessAccountId: number) {
    if (user.isAdmin === true || user.permissions.includes("*")) return;
    const membership = user.businessMemberships.find(
      (item) =>
        item.isActive &&
        item.businessAccountId === businessAccountId &&
        ["seller.dashboard.overview", "manager.dashboard.overview"].some(
          (permission) => item.permissions.includes(permission),
        ),
    );
    if (!membership) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "Wallet read permission is required",
      );
    }
  }
}
