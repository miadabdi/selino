import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  brands,
  businessAccounts,
  categories,
  products,
  storeInventories,
  tradeCreditAgreementSignatures,
  tradeCreditAgreements,
  tradeCreditAuditLogs,
  tradeCreditApprovalRequests,
  tradeCreditSettlements,
  tradeCreditTransactions,
  invoices,
  type NewTradeCreditAgreement,
  type NewTradeCreditAgreementSignature,
  type NewTradeCreditAuditLog,
  type NewTradeCreditApprovalRequest,
  type NewTradeCreditSettlement,
  type NewTradeCreditTransaction,
} from "../database/schema/index";
import type { SearchTradeOffersQueryDto } from "./dto/search-trade-offers-query.dto";
import type { ListTradeCreditAgreementsQueryDto } from "./dto/list-trade-credit-agreements-query.dto";
import type { ListCreditTransactionsQueryDto } from "./dto/list-credit-transactions-query.dto";
import type { UpdateTradeCreditAgreementDto } from "./dto/update-trade-credit-agreement.dto";

@Injectable()
export class TradeNetworkRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async findActiveMembership(userId: number, txContext: TXContext = this.db) {
    return txContext.query.businessMembers.findFirst({
      where: (table) => and(eq(table.userId, userId), eq(table.isActive, true)),
      orderBy: (table) => [asc(table.id)],
    });
  }

  async findActiveMembershipForBusinessAccount(
    userId: number,
    businessAccountId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.businessMembers.findFirst({
      where: (table) =>
        and(
          eq(table.userId, userId),
          eq(table.businessAccountId, businessAccountId),
          eq(table.isActive, true),
        ),
    });
  }

  async listActiveSellerRecipients(
    businessAccountId: number,
    txContext: TXContext = this.db,
  ) {
    const memberships = await txContext.query.businessMembers.findMany({
      where: (table) =>
        and(
          eq(table.businessAccountId, businessAccountId),
          eq(table.isActive, true),
        ),
      with: { role: true, user: true },
    });
    return memberships
      .filter((membership) => membership.role.name === "seller")
      .map((membership) => membership.user);
  }

  async createAgreement(
    data: NewTradeCreditAgreement,
    txContext: TXContext = this.db,
  ) {
    const [created] = await txContext
      .insert(tradeCreditAgreements)
      .values(data)
      .returning();
    return created;
  }

  async findAgreementById(id: number, txContext: TXContext = this.db) {
    return txContext.query.tradeCreditAgreements.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
    });
  }

  async createSignature(
    data: NewTradeCreditAgreementSignature,
    txContext: TXContext = this.db,
  ) {
    const [created] = await txContext
      .insert(tradeCreditAgreementSignatures)
      .values(data)
      .returning();
    return created;
  }

  async markBuyerSigned(
    agreementId: number,
    signedAt: Date,
    txContext: TXContext = this.db,
  ) {
    await txContext
      .update(tradeCreditAgreements)
      .set({ buyerSignedAt: signedAt, updatedAt: new Date() })
      .where(eq(tradeCreditAgreements.id, agreementId));
  }

  async markSupplierSigned(
    agreementId: number,
    signedAt: Date,
    txContext: TXContext = this.db,
  ) {
    await txContext
      .update(tradeCreditAgreements)
      .set({ supplierSignedAt: signedAt, updatedAt: new Date() })
      .where(eq(tradeCreditAgreements.id, agreementId));
  }

  async setAgreementStatus(
    agreementId: number,
    data: Partial<typeof tradeCreditAgreements.$inferInsert>,
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
      .update(tradeCreditAgreements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tradeCreditAgreements.id, agreementId))
      .returning();
    return updated;
  }

  async createAuditLog(
    data: NewTradeCreditAuditLog,
    txContext: TXContext = this.db,
  ) {
    await txContext.insert(tradeCreditAuditLogs).values(data);
  }

  async findActiveAgreementForBuyerSupplier(
    buyerBusinessAccountId: number,
    supplierBusinessAccountId: number,
    txContext: TXContext = this.db,
  ) {
    const now = new Date();
    return txContext.query.tradeCreditAgreements.findFirst({
      where: (table) =>
        and(
          eq(table.buyerBusinessAccountId, buyerBusinessAccountId),
          eq(table.supplierBusinessAccountId, supplierBusinessAccountId),
          eq(table.status, "active"),
          eq(table.isActive, true),
          isNull(table.deletedAt),
          sql`${table.buyerSignedAt} is not null`,
          sql`${table.supplierSignedAt} is not null`,
          or(isNull(table.startsAt), lte(table.startsAt, now)),
          or(isNull(table.endsAt), gte(table.endsAt, now)),
        ),
      orderBy: (table) => [desc(table.id)],
    });
  }

  async createTransaction(
    data: NewTradeCreditTransaction,
    txContext: TXContext = this.db,
  ) {
    const [created] = await txContext
      .insert(tradeCreditTransactions)
      .values(data)
      .returning();
    return created;
  }

  async consumeCredit(
    agreementId: number,
    amount: number,
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
      .update(tradeCreditAgreements)
      .set({
        usedCredit: sql`${tradeCreditAgreements.usedCredit} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tradeCreditAgreements.id, agreementId),
          sql`${tradeCreditAgreements.usedCredit} + ${amount} <= ${tradeCreditAgreements.creditLimit}`,
        ),
      )
      .returning();
    return updated;
  }

  async increaseDebt(
    agreementId: number,
    amount: number,
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
      .update(tradeCreditAgreements)
      .set({
        usedCredit: sql`${tradeCreditAgreements.usedCredit} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(tradeCreditAgreements.id, agreementId))
      .returning();
    return updated;
  }

  async createApprovalRequest(
    data: NewTradeCreditApprovalRequest,
    txContext: TXContext = this.db,
  ) {
    const [created] = await txContext
      .insert(tradeCreditApprovalRequests)
      .values(data)
      .returning();
    return created;
  }

  async findPendingApprovalByInvoiceId(
    invoiceId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.tradeCreditApprovalRequests.findFirst({
      where: (table) =>
        and(
          eq(table.invoiceId, invoiceId),
          eq(table.status, "pending"),
          isNull(table.deletedAt),
        ),
    });
  }

  async findApprovalRequestById(id: number, txContext: TXContext = this.db) {
    return txContext.query.tradeCreditApprovalRequests.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
      with: {
        agreement: true,
        invoice: {
          with: {
            items: true,
          },
        },
        purchaseRequest: true,
      },
    });
  }

  async listPendingApprovalRequestsForOwner(
    ownerBusinessAccountId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.tradeCreditApprovalRequests.findMany({
      where: (table) =>
        and(
          eq(table.ownerBusinessAccountId, ownerBusinessAccountId),
          eq(table.status, "pending"),
          isNull(table.deletedAt),
        ),
      orderBy: (table) => [asc(table.createdAt), asc(table.id)],
    });
  }

  findExpiredPendingApprovalIds(now: Date, txContext: TXContext = this.db) {
    return txContext.query.tradeCreditApprovalRequests.findMany({
      columns: { id: true },
      where: (table) =>
        and(
          eq(table.status, "pending"),
          lt(table.expiresAt, now),
          isNull(table.deletedAt),
        ),
    });
  }

  async findExpiredPendingApprovalForUpdate(
    id: number,
    now: Date,
    txContext: TXContext,
  ) {
    const [locked] = await txContext
      .select({ id: tradeCreditApprovalRequests.id })
      .from(tradeCreditApprovalRequests)
      .where(
        and(
          eq(tradeCreditApprovalRequests.id, id),
          eq(tradeCreditApprovalRequests.status, "pending"),
          lt(tradeCreditApprovalRequests.expiresAt, now),
        ),
      )
      .limit(1)
      .for("update", { skipLocked: true });
    if (!locked) return null;
    return this.findApprovalRequestById(locked.id, txContext);
  }

  async expireApprovalRequest(id: number, txContext: TXContext) {
    const [expired] = await txContext
      .update(tradeCreditApprovalRequests)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
        and(
          eq(tradeCreditApprovalRequests.id, id),
          eq(tradeCreditApprovalRequests.status, "pending"),
        ),
      )
      .returning();
    return expired;
  }

  async approveApprovalRequest(
    id: number,
    approvedBy: number,
    note: string | null,
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
      .update(tradeCreditApprovalRequests)
      .set({
        status: "approved",
        approvedBy,
        approvedAt: new Date(),
        note,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tradeCreditApprovalRequests.id, id),
          eq(tradeCreditApprovalRequests.status, "pending"),
        ),
      )
      .returning();
    return updated;
  }

  async rejectApprovalRequest(
    id: number,
    rejectedBy: number,
    note: string | null,
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
      .update(tradeCreditApprovalRequests)
      .set({
        status: "rejected",
        rejectedBy,
        rejectedAt: new Date(),
        note,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tradeCreditApprovalRequests.id, id),
          eq(tradeCreditApprovalRequests.status, "pending"),
        ),
      )
      .returning();
    return updated;
  }

  async setInvoiceStatus(
    invoiceId: number,
    status: "pending" | "rejected" | "expired",
    txContext: TXContext = this.db,
  ) {
    const [invoice] = await txContext
      .update(invoices)
      .set({ status, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId))
      .returning();
    return invoice;
  }

  async createSettlement(
    data: NewTradeCreditSettlement,
    txContext: TXContext = this.db,
  ) {
    const [created] = await txContext
      .insert(tradeCreditSettlements)
      .values(data)
      .returning();
    return created;
  }

  async confirmSettlement(
    settlementId: number,
    confirmedBy: number,
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
      .update(tradeCreditSettlements)
      .set({
        status: "confirmed",
        confirmedAt: new Date(),
        confirmedBy,
        updatedAt: new Date(),
      })
      .where(eq(tradeCreditSettlements.id, settlementId))
      .returning();
    return updated;
  }

  async listAgreements(
    query: ListTradeCreditAgreementsQueryDto,
    txContext: TXContext = this.db,
  ) {
    const condition = and(
      or(
        eq(
          tradeCreditAgreements.buyerBusinessAccountId,
          query.businessAccountId,
        ),
        eq(
          tradeCreditAgreements.supplierBusinessAccountId,
          query.businessAccountId,
        ),
      ),
      query.status == null
        ? undefined
        : eq(tradeCreditAgreements.status, query.status),
      isNull(tradeCreditAgreements.deletedAt),
    );
    const [items, countRows, summaryRows] = await Promise.all([
      txContext.query.tradeCreditAgreements.findMany({
        where: condition,
        with: {
          buyerBusinessAccount: true,
          supplierBusinessAccount: true,
        },
        orderBy: (table) => [desc(table.updatedAt), desc(table.id)],
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
      }),
      txContext
        .select({ total: sql<number>`count(*)::int` })
        .from(tradeCreditAgreements)
        .where(condition),
      txContext
        .select({
          creditLimit: sql<number>`coalesce(sum(${tradeCreditAgreements.creditLimit}), 0)::float8`,
          usedCredit: sql<number>`coalesce(sum(${tradeCreditAgreements.usedCredit}), 0)::float8`,
          activeAgreementCount: sql<number>`count(*) filter (
            where ${tradeCreditAgreements.isActive} = true
          )::int`,
        })
        .from(tradeCreditAgreements)
        .where(condition),
    ]);
    const summary = summaryRows[0] ?? {
      creditLimit: 0,
      usedCredit: 0,
      activeAgreementCount: 0,
    };
    return {
      items: items.map((agreement) => ({
        ...agreement,
        availableCredit: Math.max(
          0,
          agreement.creditLimit - agreement.usedCredit,
        ),
      })),
      page: query.page,
      limit: query.limit,
      total: countRows[0]?.total ?? 0,
      summary: {
        ...summary,
        availableCredit: Math.max(
          0,
          Number(summary.creditLimit) - Number(summary.usedCredit),
        ),
        utilizationPercent:
          Number(summary.creditLimit) > 0
            ? (Number(summary.usedCredit) / Number(summary.creditLimit)) * 100
            : 0,
      },
    };
  }

  findAgreementDetails(id: number, txContext: TXContext = this.db) {
    return txContext.query.tradeCreditAgreements.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
      with: {
        buyerBusinessAccount: true,
        supplierBusinessAccount: true,
        transactions: {
          orderBy: (table) => [desc(table.occurredAt), desc(table.id)],
          limit: 50,
        },
        settlements: {
          orderBy: (table) => [desc(table.createdAt), desc(table.id)],
        },
        signatures: true,
        auditLogs: {
          orderBy: (table) => [desc(table.createdAt), desc(table.id)],
          limit: 50,
        },
        approvalRequests: {
          orderBy: (table) => [desc(table.createdAt), desc(table.id)],
          limit: 50,
        },
      },
    });
  }

  async updateAgreement(
    id: number,
    dto: UpdateTradeCreditAgreementDto,
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
      .update(tradeCreditAgreements)
      .set({
        label: dto.label,
        description: dto.description,
        settlementCycle: dto.settlementCycle,
        settlementDayOfMonth: dto.settlementDayOfMonth,
        startsAt: dto.startsAt == null ? undefined : new Date(dto.startsAt),
        endsAt: dto.endsAt == null ? undefined : new Date(dto.endsAt),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tradeCreditAgreements.id, id),
          isNull(tradeCreditAgreements.deletedAt),
        ),
      )
      .returning();
    return updated;
  }

  async setCreditLimit(
    id: number,
    creditLimit: number,
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
      .update(tradeCreditAgreements)
      .set({ creditLimit, updatedAt: new Date() })
      .where(eq(tradeCreditAgreements.id, id))
      .returning();
    return updated;
  }

  async listCreditTransactions(
    agreementId: number,
    query: ListCreditTransactionsQueryDto,
    txContext: TXContext = this.db,
  ) {
    const statusExpression = sql`
      case
        when invoice.status in (
          'pending_credit_approval', 'pending', 'sent'
        ) then 'pending'
        when invoice.status in (
          'rejected', 'expired', 'cancelled'
        ) then 'cancelled'
        else 'completed'
      end
    `;
    const search = query.search?.trim();
    const condition = sql`
      transaction.agreement_id = ${agreementId}
      ${query.type ? sql`and transaction.type = ${query.type}` : sql``}
      ${
        query.from
          ? sql`and transaction.occurred_at >= ${new Date(query.from)}`
          : sql``
      }
      ${
        query.to
          ? sql`and transaction.occurred_at <= ${new Date(query.to)}`
          : sql``
      }
      ${query.status ? sql`and ${statusExpression} = ${query.status}` : sql``}
      ${
        search
          ? sql`and (
              concat('CRD-', transaction.id) ilike ${`%${search}%`}
              or transaction.description ilike ${`%${search}%`}
              or buyer.name ilike ${`%${search}%`}
              or supplier.name ilike ${`%${search}%`}
              or product.title ilike ${`%${search}%`}
            )`
          : sql``
      }
    `;
    type CreditTransactionRow = {
      id: number;
      createdAt: Date;
      agreementId: number;
      type: string;
      amount: number;
      currency: string;
      referenceType: string | null;
      referenceId: number | null;
      description: string | null;
      metadata: Record<string, unknown> | null;
      occurredAt: Date;
      createdBy: number | null;
      transactionCode: string;
      buyerName: string;
      supplierName: string;
      productName: string | null;
      productId: number | null;
      status: "pending" | "completed" | "cancelled";
    };
    const offset = (query.page - 1) * query.limit;
    const [items, countRows, aggregateRows] = await Promise.all([
      txContext.execute<CreditTransactionRow>(sql`
        select
          transaction.id,
          transaction.created_at as "createdAt",
          transaction.agreement_id as "agreementId",
          transaction.type,
          transaction.amount::float8 as amount,
          transaction.currency,
          transaction.reference_type as "referenceType",
          transaction.reference_id as "referenceId",
          transaction.description,
          transaction.metadata,
          transaction.occurred_at as "occurredAt",
          transaction.created_by as "createdBy",
          concat('CRD-', transaction.id) as "transactionCode",
          buyer.name as "buyerName",
          supplier.name as "supplierName",
          product.title as "productName",
          product.id as "productId",
          ${statusExpression} as status
        from trade_credit_transactions transaction
        inner join trade_credit_agreements agreement
          on agreement.id = transaction.agreement_id
        inner join business_accounts buyer
          on buyer.id = agreement.buyer_business_account_id
        inner join business_accounts supplier
          on supplier.id = agreement.supplier_business_account_id
        left join invoices invoice
          on transaction.reference_type = 'invoice'
          and invoice.id = transaction.reference_id
        left join lateral (
          select p.id, p.title
          from invoice_items item
          inner join products p on p.id = item.product_id
          where item.invoice_id = invoice.id
          order by item.id
          limit 1
        ) product on true
        where ${condition}
        order by transaction.occurred_at desc, transaction.id desc
        limit ${query.limit}
        offset ${offset}
      `),
      txContext.execute<{ total: number }>(sql`
        select count(*)::int as total
        from trade_credit_transactions transaction
        inner join trade_credit_agreements agreement
          on agreement.id = transaction.agreement_id
        inner join business_accounts buyer
          on buyer.id = agreement.buyer_business_account_id
        inner join business_accounts supplier
          on supplier.id = agreement.supplier_business_account_id
        left join invoices invoice
          on transaction.reference_type = 'invoice'
          and invoice.id = transaction.reference_id
        left join lateral (
          select p.id, p.title
          from invoice_items item
          inner join products p on p.id = item.product_id
          where item.invoice_id = invoice.id
          order by item.id
          limit 1
        ) product on true
        where ${condition}
      `),
      txContext.execute<{
        transactionCount: number;
        debitAmount: number;
        creditAmount: number;
        netAmount: number;
      }>(sql`
        select
          count(*)::int as "transactionCount",
          coalesce(sum(transaction.amount) filter (
            where transaction.amount > 0
          ), 0)::float8 as "debitAmount",
          abs(coalesce(sum(transaction.amount) filter (
            where transaction.amount < 0
          ), 0))::float8 as "creditAmount",
          coalesce(sum(transaction.amount), 0)::float8 as "netAmount"
        from trade_credit_transactions transaction
        inner join trade_credit_agreements agreement
          on agreement.id = transaction.agreement_id
        inner join business_accounts buyer
          on buyer.id = agreement.buyer_business_account_id
        inner join business_accounts supplier
          on supplier.id = agreement.supplier_business_account_id
        left join invoices invoice
          on transaction.reference_type = 'invoice'
          and invoice.id = transaction.reference_id
        left join lateral (
          select p.id, p.title
          from invoice_items item
          inner join products p on p.id = item.product_id
          where item.invoice_id = invoice.id
          order by item.id
          limit 1
        ) product on true
        where ${condition}
      `),
    ]);
    return {
      items: [...items],
      page: query.page,
      limit: query.limit,
      total: countRows[0]?.total ?? 0,
      summary: aggregateRows[0] ?? {
        transactionCount: 0,
        debitAmount: 0,
        creditAmount: 0,
        netAmount: 0,
      },
    };
  }

  async searchOffers(
    buyerBusinessAccountId: number,
    query: SearchTradeOffersQueryDto,
    txContext: TXContext = this.db,
  ) {
    const search = query.search?.trim();
    const normalizedSearch = search
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const now = new Date();

    const activeContractCondition = and(
      eq(tradeCreditAgreements.buyerBusinessAccountId, buyerBusinessAccountId),
      eq(
        tradeCreditAgreements.supplierBusinessAccountId,
        storeInventories.businessAccountId,
      ),
      eq(tradeCreditAgreements.status, "active"),
      eq(tradeCreditAgreements.isActive, true),
      isNull(tradeCreditAgreements.deletedAt),
      sql`${tradeCreditAgreements.buyerSignedAt} is not null`,
      sql`${tradeCreditAgreements.supplierSignedAt} is not null`,
      or(
        isNull(tradeCreditAgreements.startsAt),
        lte(tradeCreditAgreements.startsAt, now),
      ),
      or(
        isNull(tradeCreditAgreements.endsAt),
        gte(tradeCreditAgreements.endsAt, now),
      ),
    );

    const whereClauses: SQL<unknown>[] = [
      eq(storeInventories.isActive, true),
      eq(storeInventories.visible, true),
      isNull(products.deletedAt),
      sql`${storeInventories.stock} - ${storeInventories.reservedStock} > 0`,
      sql`${storeInventories.businessAccountId} <> ${buyerBusinessAccountId}`,
    ];

    if (search) {
      const pattern = `%${search}%`;
      const normalizedClauses: SQL<unknown>[] = normalizedSearch
        ? [
            sql`regexp_replace(lower(coalesce(${products.model}, '')), '[^a-z0-9]+', ' ', 'g') ilike ${`%${normalizedSearch}%`}`,
            sql`regexp_replace(lower(coalesce(${products.searchText}, '')), '[^a-z0-9]+', ' ', 'g') ilike ${`%${normalizedSearch}%`}`,
          ]
        : [];
      whereClauses.push(
        or(
          ilike(products.title, pattern),
          ilike(products.model, pattern),
          ilike(products.searchText, pattern),
          ilike(brands.name, pattern),
          ilike(categories.name, pattern),
          ...normalizedClauses,
        )!,
      );
    }

    if (query.contractOnly) {
      whereClauses.push(sql`${tradeCreditAgreements.id} is not null`);
    }

    const searchScore = search
      ? normalizedSearch
        ? sql<number>`case
          when ${products.title} ilike ${search} then 100
          when ${products.title} ilike ${`${search}%`} then 80
          when ${products.model} ilike ${`${search}%`} then 70
          when regexp_replace(lower(coalesce(${products.model}, '')), '[^a-z0-9]+', ' ', 'g') ilike ${`${normalizedSearch}%`} then 65
          when ${products.title} ilike ${`%${search}%`} then 50
          when ${products.model} ilike ${`%${search}%`} then 40
          when regexp_replace(lower(coalesce(${products.model}, '')), '[^a-z0-9]+', ' ', 'g') ilike ${`%${normalizedSearch}%`} then 35
          when ${products.searchText} ilike ${`%${search}%`} then 30
          when regexp_replace(lower(coalesce(${products.searchText}, '')), '[^a-z0-9]+', ' ', 'g') ilike ${`%${normalizedSearch}%`} then 25
          else 0
        end`
        : sql<number>`case
          when ${products.title} ilike ${search} then 100
          when ${products.title} ilike ${`${search}%`} then 80
          when ${products.model} ilike ${`${search}%`} then 70
          when ${products.title} ilike ${`%${search}%`} then 50
          when ${products.model} ilike ${`%${search}%`} then 40
          when ${products.searchText} ilike ${`%${search}%`} then 30
          else 0
        end`
      : sql<number>`0`;
    const availableStock = sql<number>`${storeInventories.stock} - ${storeInventories.reservedStock}`;
    const sort = query.sort ?? "relevance";
    const orderBy =
      sort === "price_asc"
        ? [
            asc(storeInventories.price),
            desc(searchScore),
            desc(availableStock),
            asc(storeInventories.id),
          ]
        : sort === "price_desc"
          ? [
              desc(storeInventories.price),
              desc(searchScore),
              desc(availableStock),
              asc(storeInventories.id),
            ]
          : [
              desc(searchScore),
              asc(storeInventories.price),
              desc(availableStock),
              asc(storeInventories.id),
            ];

    const baseQuery = txContext
      .select({
        tradeOfferId: storeInventories.id,
        storeInventoryId: storeInventories.id,
        productId: products.id,
        title: products.title,
        model: products.model,
        brandId: products.brandId,
        brandName: brands.name,
        categoryId: products.categoryId,
        categoryName: categories.name,
        supplierBusinessAccountId: businessAccounts.id,
        supplierName: businessAccounts.name,
        price: storeInventories.price,
        stock: storeInventories.stock,
        reservedStock: storeInventories.reservedStock,
        availableStock,
        minOrderQty: storeInventories.minOrderQty,
        maxOrderQty: storeInventories.maxOrderQty,
        isBestPrice: sql<boolean>`${storeInventories.price} = min(${storeInventories.price}) over (partition by ${storeInventories.productId})`,
        hasContract: sql<boolean>`${tradeCreditAgreements.id} is not null`,
        contractId: tradeCreditAgreements.id,
        contractLabel: tradeCreditAgreements.label,
        searchScore,
      })
      .from(storeInventories)
      .innerJoin(products, eq(products.id, storeInventories.productId))
      .innerJoin(
        businessAccounts,
        eq(businessAccounts.id, storeInventories.businessAccountId),
      )
      .leftJoin(brands, eq(brands.id, products.brandId))
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(tradeCreditAgreements, activeContractCondition)
      .where(and(...whereClauses));

    const rows = await baseQuery
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    const [countRow] = await txContext
      .select({ total: sql<number>`count(*)::int` })
      .from(storeInventories)
      .innerJoin(products, eq(products.id, storeInventories.productId))
      .innerJoin(
        businessAccounts,
        eq(businessAccounts.id, storeInventories.businessAccountId),
      )
      .leftJoin(brands, eq(brands.id, products.brandId))
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(tradeCreditAgreements, activeContractCondition)
      .where(and(...whereClauses));

    return {
      items: rows,
      meta: {
        page,
        limit,
        total: countRow?.total ?? 0,
        totalPages: Math.ceil((countRow?.total ?? 0) / limit),
      },
    };
  }

  async findOfferById(
    buyerBusinessAccountId: number,
    storeInventoryId: number,
    txContext: TXContext = this.db,
  ) {
    const inventory = await txContext.query.storeInventories.findFirst({
      where: (table) =>
        and(
          eq(table.id, storeInventoryId),
          eq(table.isActive, true),
          eq(table.visible, true),
          sql`${table.stock} - ${table.reservedStock} > 0`,
          sql`${table.businessAccountId} <> ${buyerBusinessAccountId}`,
        ),
      with: {
        businessAccount: true,
        product: {
          with: {
            brand: true,
            category: true,
          },
        },
      },
    });
    if (!inventory || inventory.product.deletedAt != null) return null;
    const agreement = await this.findActiveAgreementForBuyerSupplier(
      buyerBusinessAccountId,
      inventory.businessAccountId,
      txContext,
    );
    return {
      tradeOfferId: inventory.id,
      storeInventoryId: inventory.id,
      productId: inventory.productId,
      title: inventory.product.title,
      model: inventory.product.model,
      brandId: inventory.product.brandId,
      brandName: inventory.product.brand?.name ?? null,
      categoryId: inventory.product.categoryId,
      categoryName: inventory.product.category?.name ?? null,
      supplierBusinessAccountId: inventory.businessAccountId,
      supplierName: inventory.businessAccount.name,
      price: inventory.price,
      stock: inventory.stock,
      reservedStock: inventory.reservedStock,
      availableStock: inventory.stock - inventory.reservedStock,
      minOrderQty: inventory.minOrderQty,
      maxOrderQty: inventory.maxOrderQty,
      isBestPrice: false,
      hasContract: agreement != null,
      contractId: agreement?.id ?? null,
      contractLabel: agreement?.label ?? null,
      searchScore: 0,
    };
  }
}
