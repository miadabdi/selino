import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNull,
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
  purchaseRequests,
  invoiceItems,
  invoices,
  type NewTradeCreditAgreement,
  type NewTradeCreditAgreementSignature,
  type NewTradeCreditAuditLog,
  type NewTradeCreditApprovalRequest,
  type NewTradeCreditSettlement,
  type NewTradeCreditTransaction,
} from "../database/schema/index";
import type { SearchTradeOffersQueryDto } from "./dto/search-trade-offers-query.dto";

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

  async findPendingApprovalByPurchaseRequestId(
    purchaseRequestId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.tradeCreditApprovalRequests.findFirst({
      where: (table) =>
        and(
          eq(table.purchaseRequestId, purchaseRequestId),
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
        purchaseRequest: {
          with: {
            items: true,
          },
        },
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

  async createInvoiceFromPurchaseRequest(
    purchaseRequestId: number,
    buyerId: number,
    txContext: TXContext = this.db,
  ) {
    const request = await txContext.query.purchaseRequests.findFirst({
      where: (table) => eq(table.id, purchaseRequestId),
      with: { items: true },
    });

    if (!request) {
      return null;
    }

    const [invoice] = await txContext
      .insert(invoices)
      .values({
        businessAccountId: request.businessAccountId!,
        buyerId,
        purchaseRequestId: request.id,
        invoiceNumber: `INV-${Date.now()}-${request.id}`,
        status: "pending",
        totalAmount: request.totalAmount,
        currency: "IRR",
      })
      .returning();

    if (request.items.length > 0) {
      await txContext.insert(invoiceItems).values(
        request.items.map((item) => ({
          invoiceId: invoice.id,
          productId: item.productId,
          storeInventoryId: item.storeInventoryId,
          description: null,
          qty: item.qty,
          unitPrice: item.price,
          total: item.total,
        })),
      );
    }

    await txContext
      .update(purchaseRequests)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(purchaseRequests.id, request.id));

    return invoice;
  }

  async setPurchaseRequestCancelled(
    purchaseRequestId: number,
    txContext: TXContext = this.db,
  ) {
    await txContext
      .update(purchaseRequests)
      .set({ status: "cancelled", totalAmount: 0, updatedAt: new Date() })
      .where(eq(purchaseRequests.id, purchaseRequestId));
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
}
