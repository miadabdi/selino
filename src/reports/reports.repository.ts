import { Inject, Injectable } from "@nestjs/common";
import { sql, type SQL } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database, TXContext } from "../database/database.types.js";
import type {
  ManagerReport,
  ReportExportFormat,
  ReportRange,
} from "./reports.types.js";

type SummaryRow = Omit<
  ManagerReport["summary"],
  | "averageOrderValue"
  | "deliveryRate"
  | "salesGrowthPercent"
  | "orderGrowthPercent"
>;
type TrendRow = ManagerReport["trend"][number];
type OrderStatusRow = ManagerReport["orderStatuses"][number];
type SupplierPerformanceRow = ManagerReport["supplierPerformance"][number];

@Injectable()
export class ReportsRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async getReport(
    businessAccountId: number,
    range: ReportRange,
    txContext: TXContext = this.db,
  ): Promise<Omit<ManagerReport, "range">> {
    const supplierFilter = range.supplierBusinessAccountId
      ? sql`and i.supplier_business_account_id = ${range.supplierBusinessAccountId}`
      : sql``;
    const bucket = this.bucketExpression(range.granularity);
    const durationMs = range.to.getTime() - range.from.getTime();
    const previousFrom = new Date(range.from.getTime() - durationMs);
    const previousTo = range.from;

    const [summaryRows, trend, orderStatuses, supplierPerformance] =
      await Promise.all([
        txContext.execute<SummaryRow>(sql`
          with invoice_totals as (
            select
              coalesce(sum(i.total_amount) filter (
                where i.supplier_business_account_id = ${businessAccountId}
                  and i.status not in ('rejected', 'expired')
              ), 0)::float8 as gross_sales,
              coalesce(sum(i.total_amount) filter (
                where i.buyer_business_account_id = ${businessAccountId}
                  and i.status not in ('rejected', 'expired')
              ), 0)::float8 as gross_purchases,
              coalesce(sum(i.total_amount) filter (
                where i.supplier_business_account_id = ${businessAccountId}
                  and i.status = 'paid'
              ), 0)::float8 as paid_sales,
              coalesce(sum(i.total_amount) filter (
                where i.supplier_business_account_id = ${businessAccountId}
                  and i.status in ('pending', 'sent', 'delivered')
              ), 0)::float8 as outstanding_sales
            from invoices i
            where i.created_at >= ${range.from}
              and i.created_at < ${range.to}
              and (
                i.supplier_business_account_id = ${businessAccountId}
                or i.buyer_business_account_id = ${businessAccountId}
              )
              ${supplierFilter}
          ),
          order_totals as (
            select
              count(*)::int as order_count,
              count(*) filter (
                where o.status = 'delivered'
              )::int as delivered_order_count
            from orders o
            inner join invoices i on i.id = o.invoice_id
            where o.created_at >= ${range.from}
              and o.created_at < ${range.to}
              and (
                i.supplier_business_account_id = ${businessAccountId}
                or i.buyer_business_account_id = ${businessAccountId}
              )
              ${supplierFilter}
          ),
          previous_invoice_totals as (
            select
              coalesce(sum(i.total_amount) filter (
                where i.supplier_business_account_id = ${businessAccountId}
                  and i.status not in ('rejected', 'expired', 'cancelled')
              ), 0)::float8 as previous_gross_sales
            from invoices i
            where i.created_at >= ${previousFrom}
              and i.created_at < ${previousTo}
              ${supplierFilter}
          ),
          previous_order_totals as (
            select count(*)::int as previous_order_count
            from orders o
            inner join invoices i on i.id = o.invoice_id
            where o.created_at >= ${previousFrom}
              and o.created_at < ${previousTo}
              and o.deleted_at is null
              and (
                i.supplier_business_account_id = ${businessAccountId}
                or i.buyer_business_account_id = ${businessAccountId}
              )
              ${supplierFilter}
          ),
          wallet_totals as (
            select
              coalesce(sum(w.balance), 0)::float8 as wallet_balance,
              min(w.currency) as currency
            from business_wallets w
            where w.business_account_id = ${businessAccountId}
              and w.deleted_at is null
          ),
          credit_totals as (
            select
              coalesce(sum(a.credit_limit), 0)::float8 as credit_limit,
              coalesce(sum(a.used_credit), 0)::float8 as used_credit
            from trade_credit_agreements a
            where a.deleted_at is null
              and a.is_active = true
              and (
                a.buyer_business_account_id = ${businessAccountId}
                or a.supplier_business_account_id = ${businessAccountId}
              )
          )
          select
            invoice_totals.gross_sales as "grossSales",
            invoice_totals.gross_purchases as "grossPurchases",
            invoice_totals.paid_sales as "paidSales",
            invoice_totals.outstanding_sales as "outstandingSales",
            order_totals.order_count as "orderCount",
            order_totals.delivered_order_count as "deliveredOrderCount",
            previous_invoice_totals.previous_gross_sales
              as "previousGrossSales",
            previous_order_totals.previous_order_count
              as "previousOrderCount",
            wallet_totals.wallet_balance as "walletBalance",
            credit_totals.credit_limit as "creditLimit",
            credit_totals.used_credit as "usedCredit",
            coalesce(wallet_totals.currency, 'IRR') as currency
          from invoice_totals, order_totals, previous_invoice_totals,
            previous_order_totals, wallet_totals, credit_totals
        `),
        txContext.execute<TrendRow>(sql`
          select
            to_char(${bucket}, 'YYYY-MM-DD') as period,
            coalesce(sum(i.total_amount) filter (
              where i.supplier_business_account_id = ${businessAccountId}
            ), 0)::float8 as "salesAmount",
            coalesce(sum(i.total_amount) filter (
              where i.buyer_business_account_id = ${businessAccountId}
            ), 0)::float8 as "purchaseAmount",
            count(*)::int as "invoiceCount"
          from invoices i
          where i.created_at >= ${range.from}
            and i.created_at < ${range.to}
            and i.status not in ('rejected', 'expired')
            and (
              i.supplier_business_account_id = ${businessAccountId}
              or i.buyer_business_account_id = ${businessAccountId}
            )
            ${supplierFilter}
          group by ${bucket}
          order by ${bucket}
        `),
        txContext.execute<OrderStatusRow>(sql`
          select
            o.status,
            count(*)::int as count,
            coalesce(sum(i.total_amount), 0)::float8 as amount
          from orders o
          inner join invoices i on i.id = o.invoice_id
          where o.created_at >= ${range.from}
            and o.created_at < ${range.to}
            and (
              i.supplier_business_account_id = ${businessAccountId}
              or i.buyer_business_account_id = ${businessAccountId}
            )
            ${supplierFilter}
          group by o.status
          order by count(*) desc
        `),
        txContext.execute<SupplierPerformanceRow>(sql`
          select
            supplier.id as "supplierBusinessAccountId",
            supplier.name as "supplierName",
            count(distinct i.id)::int as "invoiceCount",
            count(distinct o.id)::int as "orderCount",
            count(distinct o.id) filter (
              where o.status = 'delivered'
            )::int as "deliveredOrderCount",
            coalesce(sum(i.total_amount), 0)::float8 as "totalAmount"
          from invoices i
          inner join business_accounts supplier
            on supplier.id = i.supplier_business_account_id
          left join orders o on o.invoice_id = i.id
          where i.created_at >= ${range.from}
            and i.created_at < ${range.to}
            and (
              i.supplier_business_account_id = ${businessAccountId}
              or i.buyer_business_account_id = ${businessAccountId}
            )
            ${supplierFilter}
          group by supplier.id, supplier.name
          order by "totalAmount" desc, supplier.id
          limit 100
        `),
      ]);

    const summary = summaryRows[0] ?? {
      grossSales: 0,
      grossPurchases: 0,
      paidSales: 0,
      outstandingSales: 0,
      orderCount: 0,
      deliveredOrderCount: 0,
      previousGrossSales: 0,
      previousOrderCount: 0,
      walletBalance: 0,
      creditLimit: 0,
      usedCredit: 0,
      currency: "IRR",
    };

    const percentChange = (current: number, previous: number) =>
      previous === 0
        ? current === 0
          ? 0
          : null
        : ((current - previous) / Math.abs(previous)) * 100;

    return {
      summary: {
        ...summary,
        averageOrderValue:
          summary.orderCount > 0 ? summary.grossSales / summary.orderCount : 0,
        deliveryRate:
          summary.orderCount > 0
            ? (summary.deliveredOrderCount / summary.orderCount) * 100
            : 0,
        salesGrowthPercent: percentChange(
          summary.grossSales,
          summary.previousGrossSales,
        ),
        orderGrowthPercent: percentChange(
          summary.orderCount,
          summary.previousOrderCount,
        ),
      },
      trend: [...trend],
      orderStatuses: [...orderStatuses],
      supplierPerformance: [...supplierPerformance],
    };
  }

  async createExport(
    businessAccountId: number,
    requestedBy: number,
    range: ReportRange,
    format: ReportExportFormat,
    txContext: TXContext = this.db,
  ): Promise<number> {
    const rows = await txContext.execute<{ id: number }>(sql`
      insert into report_exports (
        business_account_id,
        requested_by,
        type,
        format,
        status,
        parameters,
        started_at,
        completed_at
      )
      values (
        ${businessAccountId},
        ${requestedBy},
        'performance',
        ${format},
        'processing',
        ${JSON.stringify({
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          granularity: range.granularity,
          supplierBusinessAccountId: range.supplierBusinessAccountId,
        })}::jsonb,
        now(),
        null
      )
      returning id
    `);
    return rows[0].id;
  }

  async markExportCompleted(
    exportId: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext.execute(sql`
      update report_exports
      set
        status = 'completed',
        error = null,
        completed_at = now(),
        updated_at = now()
      where id = ${exportId}
        and deleted_at is null
    `);
  }

  async markExportFailed(
    exportId: number,
    error: string,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext.execute(sql`
      update report_exports
      set
        status = 'failed',
        error = ${error.slice(0, 2000)},
        completed_at = now(),
        updated_at = now()
      where id = ${exportId}
        and deleted_at is null
    `);
  }

  private bucketExpression(granularity: ReportRange["granularity"]): SQL {
    switch (granularity) {
      case "month":
        return sql`date_trunc('month', i.created_at)`;
      case "week":
        return sql`date_trunc('week', i.created_at)`;
      default:
        return sql`date_trunc('day', i.created_at)`;
    }
  }
}
