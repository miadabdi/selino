import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import { invoiceStatusEvents, invoices } from "../database/schema/index";
import type { ExportInvoicesDto } from "./dto/export-invoices.dto";
import type { ListInvoicesQueryDto } from "./dto/list-invoices-query.dto";

@Injectable()
export class InvoicesRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async listForBusiness(
    businessAccountId: number,
    query: ListInvoicesQueryDto,
    requesterId?: number,
    txContext: TXContext = this.db,
  ) {
    const accountCondition =
      query.direction === "purchase"
        ? eq(invoices.buyerBusinessAccountId, businessAccountId)
        : eq(invoices.supplierBusinessAccountId, businessAccountId);
    const statuses =
      query.view === "active"
        ? query.direction === "purchase"
          ? (["pending_credit_approval", "pending", "sent"] as const)
          : (["pending", "sent"] as const)
        : (["delivered", "paid", "rejected", "expired", "cancelled"] as const);
    const filters: SQL[] = [
      accountCondition,
      inArray(invoices.status, statuses),
    ];
    if (requesterId != null) {
      filters.push(eq(invoices.buyerId, requesterId));
    }
    if (query.supplierBusinessAccountId != null) {
      filters.push(
        eq(invoices.supplierBusinessAccountId, query.supplierBusinessAccountId),
      );
    }
    if (query.status != null) {
      filters.push(eq(invoices.status, query.status));
    }
    if (query.from != null) {
      filters.push(gte(invoices.createdAt, new Date(query.from)));
    }
    if (query.to != null) {
      filters.push(lte(invoices.createdAt, new Date(query.to)));
    }
    if (query.minAmount != null) {
      filters.push(gte(invoices.totalAmount, query.minAmount));
    }
    if (query.maxAmount != null) {
      filters.push(lte(invoices.totalAmount, query.maxAmount));
    }
    const condition = and(...filters);
    const offset = (query.page - 1) * query.limit;

    const [items, countRows] = await Promise.all([
      txContext.query.invoices.findMany({
        where: condition,
        with: {
          buyerBusinessAccount: true,
          supplierBusinessAccount: true,
          items: {
            with: {
              product: true,
            },
          },
        },
        orderBy: (table) => [desc(table.createdAt), desc(table.id)],
        limit: query.limit,
        offset,
      }),
      txContext
        .select({ total: sql<number>`count(*)::int` })
        .from(invoices)
        .where(condition),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total: countRows[0]?.total ?? 0,
    };
  }

  findManyForExport(
    businessAccountId: number,
    dto: ExportInvoicesDto,
    requesterId?: number,
    txContext: TXContext = this.db,
  ) {
    const accountCondition =
      dto.direction === "purchase"
        ? eq(invoices.buyerBusinessAccountId, businessAccountId)
        : eq(invoices.supplierBusinessAccountId, businessAccountId);
    const statuses =
      dto.view === "active"
        ? dto.direction === "purchase"
          ? (["pending_credit_approval", "pending", "sent"] as const)
          : (["pending", "sent"] as const)
        : (["delivered", "paid", "rejected", "expired", "cancelled"] as const);

    return txContext.query.invoices.findMany({
      where: and(
        accountCondition,
        inArray(invoices.status, statuses),
        inArray(invoices.id, dto.invoiceIds),
        requesterId == null ? undefined : eq(invoices.buyerId, requesterId),
      ),
      with: {
        buyerBusinessAccount: true,
        supplierBusinessAccount: true,
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: (table) => [desc(table.createdAt), desc(table.id)],
    });
  }

  findForBusiness(
    businessAccountId: number,
    invoiceId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.invoices.findFirst({
      where: (table) =>
        and(
          eq(table.id, invoiceId),
          sql`(${table.buyerBusinessAccountId} = ${businessAccountId} or ${table.supplierBusinessAccountId} = ${businessAccountId})`,
        ),
      with: {
        buyerBusinessAccount: true,
        supplierBusinessAccount: true,
        items: {
          with: {
            product: true,
          },
        },
        statusEvents: {
          orderBy: (table) => [desc(table.createdAt), desc(table.id)],
        },
        order: {
          with: {
            statusEvents: true,
            shipments: {
              with: {
                locationEvents: true,
              },
            },
          },
        },
        payments: true,
      },
    });
  }

  async transitionStatus(
    invoiceId: number,
    previousStatus: "pending" | "sent",
    status: "sent" | "delivered" | "cancelled",
    changedBy: number,
    reason: string | null,
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
      .update(invoices)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(eq(invoices.id, invoiceId), eq(invoices.status, previousStatus)),
      )
      .returning();
    if (!updated) return null;
    await txContext.insert(invoiceStatusEvents).values({
      invoiceId,
      previousStatus,
      status,
      changedBy,
      reason,
    });
    return updated;
  }
}
