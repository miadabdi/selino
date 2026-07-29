import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database, TXContext } from "../database/database.types.js";
import type { CreateSupplierLinkDto } from "./dto/create-supplier-link.dto.js";
import type { ListSuppliersQueryDto } from "./dto/list-suppliers-query.dto.js";
import type { UpdateSupplierLinkDto } from "./dto/update-supplier-link.dto.js";
import type { PaginatedSuppliers, SupplierLink } from "./suppliers.types.js";

type CountRow = { total: number };
type BusinessRow = { id: number };

@Injectable()
export class SuppliersRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async list(
    businessAccountId: number,
    query: ListSuppliersQueryDto,
    txContext: TXContext = this.db,
  ): Promise<PaginatedSuppliers> {
    const offset = (query.page - 1) * query.limit;
    const searchFilter = query.search
      ? sql`and (supplier.name ilike ${`%${query.search}%`} or supplier.slug ilike ${`%${query.search}%`})`
      : sql``;
    const statusFilter = query.status
      ? sql`and link.status = ${query.status}`
      : sql``;

    const [items, countRows] = await Promise.all([
      txContext.execute<SupplierLink>(sql`
        select
          link.id,
          link.buyer_business_account_id as "buyerBusinessAccountId",
          link.supplier_business_account_id as "supplierBusinessAccountId",
          supplier.name as "supplierName",
          supplier.slug as "supplierSlug",
          supplier.description as "supplierDescription",
          supplier.logo_file_id as "supplierLogoFileId",
          link.status,
          link.notes,
          invoice_stats.invoice_count as "invoiceCount",
          order_stats.order_count as "orderCount",
          order_stats.delivered_order_count as "deliveredOrderCount",
          invoice_stats.total_purchased as "totalPurchased",
          credit_stats.credit_limit as "creditLimit",
          credit_stats.used_credit as "usedCredit",
          link.created_at as "createdAt",
          link.updated_at as "updatedAt"
        from business_supplier_links link
        inner join business_accounts supplier
          on supplier.id = link.supplier_business_account_id
        left join lateral (
          select
            count(*)::int as invoice_count,
            coalesce(sum(i.total_amount), 0)::float8 as total_purchased
          from invoices i
          where i.buyer_business_account_id = link.buyer_business_account_id
            and i.supplier_business_account_id = link.supplier_business_account_id
        ) invoice_stats on true
        left join lateral (
          select
            count(*)::int as order_count,
            count(*) filter (where o.status = 'delivered')::int
              as delivered_order_count
          from orders o
          where o.buyer_business_account_id = link.buyer_business_account_id
            and o.supplier_business_account_id = link.supplier_business_account_id
            and o.deleted_at is null
        ) order_stats on true
        left join lateral (
          select
            coalesce(sum(credit.credit_limit), 0)::float8 as credit_limit,
            coalesce(sum(credit.used_credit), 0)::float8 as used_credit
          from trade_credit_agreements credit
          where credit.buyer_business_account_id = link.buyer_business_account_id
            and credit.supplier_business_account_id = link.supplier_business_account_id
            and credit.deleted_at is null
            and credit.is_active = true
        ) credit_stats on true
        where link.buyer_business_account_id = ${businessAccountId}
          and link.deleted_at is null
          and supplier.deleted_at is null
          ${searchFilter}
          ${statusFilter}
        order by supplier.name, link.id
        limit ${query.limit}
        offset ${offset}
      `),
      txContext.execute<CountRow>(sql`
        select count(*)::int as total
        from business_supplier_links link
        inner join business_accounts supplier
          on supplier.id = link.supplier_business_account_id
        where link.buyer_business_account_id = ${businessAccountId}
          and link.deleted_at is null
          and supplier.deleted_at is null
          ${searchFilter}
          ${statusFilter}
      `),
    ]);

    return {
      items: [...items],
      page: query.page,
      limit: query.limit,
      total: countRows[0]?.total ?? 0,
    };
  }

  async findById(
    businessAccountId: number,
    id: number,
    txContext: TXContext = this.db,
  ): Promise<SupplierLink | undefined> {
    const rows = await txContext.execute<SupplierLink>(sql`
      select
        link.id,
        link.buyer_business_account_id as "buyerBusinessAccountId",
        link.supplier_business_account_id as "supplierBusinessAccountId",
        supplier.name as "supplierName",
        supplier.slug as "supplierSlug",
        supplier.description as "supplierDescription",
        supplier.logo_file_id as "supplierLogoFileId",
        link.status,
        link.notes,
        invoice_stats.invoice_count as "invoiceCount",
        order_stats.order_count as "orderCount",
        order_stats.delivered_order_count as "deliveredOrderCount",
        invoice_stats.total_purchased as "totalPurchased",
        credit_stats.credit_limit as "creditLimit",
        credit_stats.used_credit as "usedCredit",
        link.created_at as "createdAt",
        link.updated_at as "updatedAt"
      from business_supplier_links link
      inner join business_accounts supplier
        on supplier.id = link.supplier_business_account_id
      left join lateral (
        select
          count(*)::int as invoice_count,
          coalesce(sum(i.total_amount), 0)::float8 as total_purchased
        from invoices i
        where i.buyer_business_account_id = link.buyer_business_account_id
          and i.supplier_business_account_id = link.supplier_business_account_id
      ) invoice_stats on true
      left join lateral (
        select
          count(*)::int as order_count,
          count(*) filter (where o.status = 'delivered')::int
            as delivered_order_count
        from orders o
        where o.buyer_business_account_id = link.buyer_business_account_id
          and o.supplier_business_account_id = link.supplier_business_account_id
          and o.deleted_at is null
      ) order_stats on true
      left join lateral (
        select
          coalesce(sum(credit.credit_limit), 0)::float8 as credit_limit,
          coalesce(sum(credit.used_credit), 0)::float8 as used_credit
        from trade_credit_agreements credit
        where credit.buyer_business_account_id = link.buyer_business_account_id
          and credit.supplier_business_account_id = link.supplier_business_account_id
          and credit.deleted_at is null
          and credit.is_active = true
      ) credit_stats on true
      where link.id = ${id}
        and link.buyer_business_account_id = ${businessAccountId}
        and link.deleted_at is null
        and supplier.deleted_at is null
      limit 1
    `);
    return rows[0];
  }

  async businessExists(
    businessAccountId: number,
    txContext: TXContext = this.db,
  ): Promise<boolean> {
    const rows = await txContext.execute<BusinessRow>(sql`
      select id
      from business_accounts
      where id = ${businessAccountId}
        and deleted_at is null
      limit 1
    `);
    return rows.length > 0;
  }

  async create(
    businessAccountId: number,
    userId: number,
    dto: CreateSupplierLinkDto,
    txContext: TXContext = this.db,
  ): Promise<number> {
    const rows = await txContext.execute<{ id: number }>(sql`
      insert into business_supplier_links (
        buyer_business_account_id,
        supplier_business_account_id,
        status,
        notes,
        requested_by
      )
      values (
        ${businessAccountId},
        ${dto.supplierBusinessAccountId},
        'pending',
        ${dto.notes ?? null},
        ${userId}
      )
      returning id
    `);
    return rows[0].id;
  }

  async update(
    businessAccountId: number,
    id: number,
    dto: UpdateSupplierLinkDto,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext.execute(sql`
      update business_supplier_links
      set
        status = coalesce(${dto.status ?? null}, status),
        notes = case
          when ${dto.notes !== undefined} then ${dto.notes ?? null}
          else notes
        end,
        updated_at = now()
      where id = ${id}
        and buyer_business_account_id = ${businessAccountId}
        and deleted_at is null
    `);
  }

  async remove(
    businessAccountId: number,
    id: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext.execute(sql`
      update business_supplier_links
      set deleted_at = now(), updated_at = now()
      where id = ${id}
        and buyer_business_account_id = ${businessAccountId}
        and deleted_at is null
    `);
  }
}
