import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import { invoices } from "../database/schema/index";
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
        : (["delivered", "paid", "rejected", "expired"] as const);
    const condition = and(accountCondition, inArray(invoices.status, statuses));
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
        : (["delivered", "paid", "rejected", "expired"] as const);

    return txContext.query.invoices.findMany({
      where: and(
        accountCondition,
        inArray(invoices.status, statuses),
        inArray(invoices.id, dto.invoiceIds),
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
      },
    });
  }
}
