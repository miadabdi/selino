import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import { businessWallets, walletTransactions } from "../database/schema/index";
import type { ListWalletTransactionsQueryDto } from "./dto/list-wallet-transactions-query.dto";

export type WalletLedgerEntry = {
  walletId: number;
  invoiceId?: number | null;
  type:
    | "deposit"
    | "withdrawal"
    | "payment"
    | "refund"
    | "adjustment"
    | "reservation"
    | "release";
  direction: "credit" | "debit";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  currency: string;
  referenceType: string;
  referenceId?: string | null;
  idempotencyKey: string;
  description?: string | null;
  createdBy?: number | null;
};

@Injectable()
export class WalletsRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  findByBusinessAccount(
    businessAccountId: number,
    currency = "IRR",
    txContext: TXContext = this.db,
  ) {
    return txContext.query.businessWallets.findFirst({
      where: (table) =>
        and(
          eq(table.businessAccountId, businessAccountId),
          eq(table.currency, currency),
        ),
    });
  }

  async findByBusinessAccountForUpdate(
    businessAccountId: number,
    currency: string,
    txContext: TXContext,
  ) {
    const [wallet] = await txContext
      .select()
      .from(businessWallets)
      .where(
        and(
          eq(businessWallets.businessAccountId, businessAccountId),
          eq(businessWallets.currency, currency),
        ),
      )
      .for("update");
    return wallet;
  }

  async create(
    businessAccountId: number,
    currency = "IRR",
    txContext: TXContext = this.db,
  ) {
    const [wallet] = await txContext
      .insert(businessWallets)
      .values({ businessAccountId, currency, balance: 0 })
      .onConflictDoNothing()
      .returning();

    return (
      wallet ??
      this.findByBusinessAccount(businessAccountId, currency, txContext)
    );
  }

  async changeBalance(walletId: number, delta: number, txContext: TXContext) {
    const [wallet] = await txContext
      .update(businessWallets)
      .set({
        balance: sql`${businessWallets.balance} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businessWallets.id, walletId),
          sql`${businessWallets.balance} + ${delta} >= 0`,
        ),
      )
      .returning();
    return wallet;
  }

  findTransactionByIdempotencyKey(
    walletId: number,
    idempotencyKey: string,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.walletTransactions.findFirst({
      where: (table) =>
        and(
          eq(table.walletId, walletId),
          eq(table.idempotencyKey, idempotencyKey),
        ),
    });
  }

  async createTransaction(entry: WalletLedgerEntry, txContext: TXContext) {
    const [transaction] = await txContext
      .insert(walletTransactions)
      .values(entry)
      .returning();
    return transaction;
  }

  async listTransactions(
    walletId: number,
    query: ListWalletTransactionsQueryDto,
    txContext: TXContext = this.db,
  ) {
    const offset = (query.page - 1) * query.limit;
    const [items, countRows] = await Promise.all([
      txContext.query.walletTransactions.findMany({
        where: (table) => eq(table.walletId, walletId),
        orderBy: (table) => [desc(table.createdAt), desc(table.id)],
        limit: query.limit,
        offset,
      }),
      txContext
        .select({ total: sql<number>`count(*)::int` })
        .from(walletTransactions)
        .where(eq(walletTransactions.walletId, walletId)),
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total: countRows[0]?.total ?? 0,
    };
  }
}
