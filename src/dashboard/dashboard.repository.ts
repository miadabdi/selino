import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database, TXContext } from "../database/database.types.js";
import type { DashboardOverview, DashboardRange } from "./dashboard.types.js";

type SummaryRow = {
  salesAmount: number;
  purchaseAmount: number;
  activeOrders: number;
  completedOrders: number;
  walletBalance: number;
  creditLimit: number;
  usedCredit: number;
  currency: string | null;
  newPurchaseRequests: number;
  pendingCreditPurchaseRequests: number;
  confirmedPurchaseRequests: number;
  cancelledPurchaseRequests: number;
  activePurchaseInvoices: number;
  historicalPurchaseInvoices: number;
  paidPurchaseInvoices: number;
  pendingPurchaseInvoices: number;
  sentPurchaseInvoices: number;
  todayPaidPurchaseInvoices: number;
  todayActivePurchaseInvoices: number;
  todayPendingPurchaseInvoices: number;
  todaySentPurchaseInvoices: number;
  outstandingPurchaseAmount: number;
  todaySalesAmount: number;
  yesterdaySalesAmount: number;
  periodOrderCount: number;
  previousOrderCount: number;
  periodRevenue: number;
  previousRevenue: number;
  previousSalesAmount: number;
  previousCompletedOrders: number;
  currentMonthOrderCount: number;
  previousMonthOrderCount: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
};

type TrendRow = {
  date: string;
  amount: number;
  orderCount: number;
  purchaseAmount: number;
  deliveredOrderCount: number;
  averageOrderValue: number;
};

type RecentOrderRow = DashboardOverview["recentOrders"][number];
type TopSupplierRow = DashboardOverview["topSuppliers"][number];
type TopProductRow = DashboardOverview["topProducts"][number];

@Injectable()
export class DashboardRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async getOverview(
    businessAccountId: number,
    range: DashboardRange,
    txContext: TXContext = this.db,
  ): Promise<Omit<DashboardOverview, "range">> {
    const rangeFrom = range.from.toISOString();
    const rangeTo = range.to.toISOString();
    const durationMs = range.to.getTime() - range.from.getTime();
    const previousFrom = new Date(
      range.from.getTime() - durationMs,
    ).toISOString();
    const previousTo = rangeFrom;

    const [summaryRows, salesTrend, recentOrders, topSuppliers, topProducts] =
      await Promise.all([
        txContext.execute<SummaryRow>(sql`
        with invoice_totals as (
          select
            coalesce(sum(i.total_amount) filter (
              where i.supplier_business_account_id = ${businessAccountId}
                and i.status in ('sent', 'delivered', 'paid')
            ), 0)::float8 as sales_amount,
            coalesce(sum(i.total_amount) filter (
              where i.buyer_business_account_id = ${businessAccountId}
                and i.status in ('sent', 'delivered', 'paid')
            ), 0)::float8 as purchase_amount,
            coalesce(sum(i.total_amount) filter (
              where i.supplier_business_account_id = ${businessAccountId}
                and i.status = 'paid'
            ), 0)::float8 as period_revenue
          from invoices i
          where i.created_at >= ${rangeFrom}
            and i.created_at < ${rangeTo}
            and (
              i.supplier_business_account_id = ${businessAccountId}
              or i.buyer_business_account_id = ${businessAccountId}
            )
        ),
        previous_invoice_totals as (
          select
            coalesce(sum(i.total_amount) filter (
              where i.supplier_business_account_id = ${businessAccountId}
                and i.status in ('sent', 'delivered', 'paid')
            ), 0)::float8 as previous_sales_amount,
            coalesce(sum(i.total_amount) filter (
              where i.supplier_business_account_id = ${businessAccountId}
                and i.status = 'paid'
            ), 0)::float8 as previous_revenue
          from invoices i
          where i.created_at >= ${previousFrom}
            and i.created_at < ${previousTo}
        ),
        daily_sales as (
          select
            coalesce(sum(i.total_amount) filter (
              where i.created_at >= date_trunc('day', now())
                and i.created_at < date_trunc('day', now()) + interval '1 day'
            ), 0)::float8 as today_sales_amount,
            coalesce(sum(i.total_amount) filter (
              where i.created_at >= date_trunc('day', now()) - interval '1 day'
                and i.created_at < date_trunc('day', now())
            ), 0)::float8 as yesterday_sales_amount
          from invoices i
          where i.supplier_business_account_id = ${businessAccountId}
            and i.status in ('sent', 'delivered', 'paid')
        ),
        order_totals as (
          select
            count(*)::int as period_order_count,
            count(*) filter (
              where o.status not in ('delivered', 'cancelled')
            )::int as active_orders,
            count(*) filter (
              where o.status = 'delivered'
            )::int as completed_orders
          from orders o
          inner join invoices i on i.id = o.invoice_id
          where o.created_at >= ${rangeFrom}
            and o.created_at < ${rangeTo}
            and o.deleted_at is null
            and (
              i.supplier_business_account_id = ${businessAccountId}
              or i.buyer_business_account_id = ${businessAccountId}
            )
        ),
        previous_order_totals as (
          select
            count(*)::int as previous_order_count,
            count(*) filter (where o.status = 'delivered')::int
              as previous_completed_orders
          from orders o
          where o.created_at >= ${previousFrom}
            and o.created_at < ${previousTo}
            and o.deleted_at is null
            and (
              o.supplier_business_account_id = ${businessAccountId}
              or o.buyer_business_account_id = ${businessAccountId}
            )
        ),
        manager_month_totals as (
          select
            count(distinct o.id) filter (
              where o.created_at >= date_trunc('month', now())
                and o.created_at < date_trunc('month', now()) + interval '1 month'
            )::int as current_month_order_count,
            count(distinct o.id) filter (
              where o.created_at >= date_trunc('month', now()) - interval '1 month'
                and o.created_at < date_trunc('month', now())
            )::int as previous_month_order_count,
            coalesce(sum(i.total_amount) filter (
              where i.status = 'paid'
                and i.created_at >= date_trunc('month', now())
                and i.created_at < date_trunc('month', now()) + interval '1 month'
            ), 0)::float8 as current_month_revenue,
            coalesce(sum(i.total_amount) filter (
              where i.status = 'paid'
                and i.created_at >= date_trunc('month', now()) - interval '1 month'
                and i.created_at < date_trunc('month', now())
            ), 0)::float8 as previous_month_revenue
          from invoices i
          left join orders o on o.invoice_id = i.id and o.deleted_at is null
          where i.supplier_business_account_id = ${businessAccountId}
            and i.created_at >= date_trunc('month', now()) - interval '1 month'
            and i.created_at < date_trunc('month', now()) + interval '1 month'
        ),
        purchase_request_totals as (
          select
            count(*) filter (where request.status = 'new')::int
              as new_purchase_requests,
            count(*) filter (
              where request.status = 'pending_credit_approval'
            )::int as pending_credit_purchase_requests,
            count(*) filter (where request.status = 'confirmed')::int
              as confirmed_purchase_requests,
            count(*) filter (where request.status = 'cancelled')::int
              as cancelled_purchase_requests
          from purchase_requests request
          where request.buyer_business_account_id = ${businessAccountId}
            and request.created_at >= ${rangeFrom}
            and request.created_at < ${rangeTo}
        ),
        purchase_invoice_totals as (
          select
            count(*) filter (
              where i.status in ('pending_credit_approval', 'pending', 'sent')
            )::int as active_purchase_invoices,
            count(*) filter (
              where i.status in ('delivered', 'paid', 'rejected', 'expired', 'cancelled')
            )::int as historical_purchase_invoices,
            count(*) filter (
              where i.status = 'paid'
            )::int as paid_purchase_invoices,
            count(*) filter (
              where i.status = 'pending'
            )::int as pending_purchase_invoices,
            count(*) filter (
              where i.status = 'sent'
            )::int as sent_purchase_invoices,
            count(*) filter (
              where i.status = 'paid'
                and i.created_at >= date_trunc('day', now())
                and i.created_at < date_trunc('day', now()) + interval '1 day'
            )::int as today_paid_purchase_invoices,
            count(*) filter (
              where i.status in ('pending_credit_approval', 'pending', 'sent')
                and i.created_at >= date_trunc('day', now())
                and i.created_at < date_trunc('day', now()) + interval '1 day'
            )::int as today_active_purchase_invoices,
            count(*) filter (
              where i.status = 'pending'
                and i.created_at >= date_trunc('day', now())
                and i.created_at < date_trunc('day', now()) + interval '1 day'
            )::int as today_pending_purchase_invoices,
            count(*) filter (
              where i.status = 'sent'
                and i.created_at >= date_trunc('day', now())
                and i.created_at < date_trunc('day', now()) + interval '1 day'
            )::int as today_sent_purchase_invoices,
            coalesce(sum(i.total_amount) filter (
              where i.status in ('pending_credit_approval', 'pending', 'sent', 'delivered')
            ), 0)::float8 as outstanding_purchase_amount
          from invoices i
          where i.buyer_business_account_id = ${businessAccountId}
            and i.created_at >= ${rangeFrom}
            and i.created_at < ${rangeTo}
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
          invoice_totals.sales_amount as "salesAmount",
          invoice_totals.purchase_amount as "purchaseAmount",
          invoice_totals.period_revenue as "periodRevenue",
          previous_invoice_totals.previous_sales_amount as "previousSalesAmount",
          previous_invoice_totals.previous_revenue as "previousRevenue",
          daily_sales.today_sales_amount as "todaySalesAmount",
          daily_sales.yesterday_sales_amount as "yesterdaySalesAmount",
          order_totals.period_order_count as "periodOrderCount",
          previous_order_totals.previous_order_count as "previousOrderCount",
          previous_order_totals.previous_completed_orders
            as "previousCompletedOrders",
          manager_month_totals.current_month_order_count
            as "currentMonthOrderCount",
          manager_month_totals.previous_month_order_count
            as "previousMonthOrderCount",
          manager_month_totals.current_month_revenue
            as "currentMonthRevenue",
          manager_month_totals.previous_month_revenue
            as "previousMonthRevenue",
          order_totals.active_orders as "activeOrders",
          order_totals.completed_orders as "completedOrders",
          wallet_totals.wallet_balance as "walletBalance",
          credit_totals.credit_limit as "creditLimit",
          credit_totals.used_credit as "usedCredit",
          purchase_request_totals.new_purchase_requests
            as "newPurchaseRequests",
          purchase_request_totals.pending_credit_purchase_requests
            as "pendingCreditPurchaseRequests",
          purchase_request_totals.confirmed_purchase_requests
            as "confirmedPurchaseRequests",
          purchase_request_totals.cancelled_purchase_requests
            as "cancelledPurchaseRequests",
          purchase_invoice_totals.active_purchase_invoices
            as "activePurchaseInvoices",
          purchase_invoice_totals.historical_purchase_invoices
            as "historicalPurchaseInvoices",
          purchase_invoice_totals.paid_purchase_invoices
            as "paidPurchaseInvoices",
          purchase_invoice_totals.pending_purchase_invoices
            as "pendingPurchaseInvoices",
          purchase_invoice_totals.sent_purchase_invoices
            as "sentPurchaseInvoices",
          purchase_invoice_totals.today_paid_purchase_invoices
            as "todayPaidPurchaseInvoices",
          purchase_invoice_totals.today_active_purchase_invoices
            as "todayActivePurchaseInvoices",
          purchase_invoice_totals.today_pending_purchase_invoices
            as "todayPendingPurchaseInvoices",
          purchase_invoice_totals.today_sent_purchase_invoices
            as "todaySentPurchaseInvoices",
          purchase_invoice_totals.outstanding_purchase_amount
            as "outstandingPurchaseAmount",
          coalesce(wallet_totals.currency, 'IRR') as currency
        from
          invoice_totals,
          previous_invoice_totals,
          daily_sales,
          order_totals,
          previous_order_totals,
          manager_month_totals,
          purchase_request_totals,
          purchase_invoice_totals,
          wallet_totals,
          credit_totals
      `),
        txContext.execute<TrendRow>(sql`
        select
          to_char(date_trunc('day', i.created_at), 'YYYY-MM-DD') as date,
          coalesce(sum(i.total_amount), 0)::float8 as amount,
          coalesce(sum(i.total_amount) filter (
            where i.buyer_business_account_id = ${businessAccountId}
          ), 0)::float8 as "purchaseAmount",
          count(distinct o.id)::int as "orderCount",
          count(distinct o.id) filter (
            where o.status = 'delivered'
          )::int as "deliveredOrderCount",
          case
            when count(distinct o.id) = 0 then 0
            else coalesce(sum(i.total_amount), 0)::float8
              / count(distinct o.id)
          end as "averageOrderValue"
        from invoices i
        left join orders o on o.invoice_id = i.id and o.deleted_at is null
        where i.supplier_business_account_id = ${businessAccountId}
          and i.status in ('sent', 'delivered', 'paid')
          and i.created_at >= ${rangeFrom}
          and i.created_at < ${rangeTo}
        group by date_trunc('day', i.created_at)
        order by date_trunc('day', i.created_at)
      `),
        txContext.execute<RecentOrderRow>(sql`
        select
          o.id,
          o.order_number as "orderNumber",
          i.id as "invoiceId",
          i.invoice_number as "invoiceNumber",
          case
            when i.supplier_business_account_id = ${businessAccountId}
              then buyer.name
            else supplier.name
          end as "counterpartyName",
          buyer.name as "buyerName",
          supplier.name as "supplierName",
          o.status,
          coalesce((
            select count(*)::int from invoice_items item
            where item.invoice_id = i.id
          ), 0) as "itemCount",
          coalesce((
            select sum(item.qty)::int from invoice_items item
            where item.invoice_id = i.id
          ), 0) as quantity,
          i.total_amount::float8 as "totalAmount",
          i.currency,
          o.created_at as "createdAt",
          shipment.id as "shipmentId",
          shipment.status as "shipmentStatus",
          shipment.estimated_delivery_at as "estimatedDeliveryAt"
        from orders o
        inner join invoices i on i.id = o.invoice_id
        inner join business_accounts buyer
          on buyer.id = i.buyer_business_account_id
        inner join business_accounts supplier
          on supplier.id = i.supplier_business_account_id
        left join lateral (
          select s.id, s.status, s.estimated_delivery_at
          from shipments s
          where s.order_id = o.id and s.deleted_at is null
          order by s.created_at desc, s.id desc
          limit 1
        ) shipment on true
        where (
            i.supplier_business_account_id = ${businessAccountId}
            or i.buyer_business_account_id = ${businessAccountId}
          )
          and o.created_at >= ${rangeFrom}
          and o.created_at < ${rangeTo}
          and o.deleted_at is null
        order by o.created_at desc, o.id desc
        limit 10
      `),
        txContext.execute<TopSupplierRow>(sql`
        select
          supplier.id,
          supplier.name,
          (
            select address.city
            from business_addresses address
            where address.business_account_id = supplier.id
              and address.deleted_at is null
              and address.is_active = true
            order by address.is_default desc, address.id
            limit 1
          ) as city,
          count(*) filter (
            where o.status not in ('delivered', 'cancelled')
          )::int as "activeOrders",
          coalesce(sum(i.total_amount), 0)::float8 as "totalPurchased"
        from invoices i
        inner join business_accounts supplier
          on supplier.id = i.supplier_business_account_id
        left join orders o on o.invoice_id = i.id and o.deleted_at is null
        where i.buyer_business_account_id = ${businessAccountId}
          and i.created_at >= ${rangeFrom}
          and i.created_at < ${rangeTo}
          and i.status not in ('rejected', 'expired', 'cancelled')
        group by supplier.id, supplier.name
        order by "totalPurchased" desc, supplier.id
        limit 8
      `),
        txContext.execute<TopProductRow>(sql`
        select
          product.id,
          product.title as name,
          concat('PRD-', product.id) as "productCode",
          product.model,
          product.default_image_file_id as "defaultImageFileId",
          (min(product.attributes::text))::json as attributes,
          min(supplier.name) as "supplierName",
          array_agg(distinct supplier.name order by supplier.name)
            as "supplierNames",
          coalesce(sum(item.qty), 0)::int as quantity,
          coalesce(sum(item.total), 0)::float8 as "totalAmount"
        from invoice_items item
        inner join invoices invoice on invoice.id = item.invoice_id
        inner join products product on product.id = item.product_id
        inner join business_accounts supplier
          on supplier.id = invoice.supplier_business_account_id
        where invoice.buyer_business_account_id = ${businessAccountId}
          and invoice.created_at >= ${rangeFrom}
          and invoice.created_at < ${rangeTo}
          and invoice.status not in ('rejected', 'expired', 'cancelled')
        group by product.id, product.title, product.model,
          product.default_image_file_id
        order by "totalAmount" desc, product.id
        limit 8
      `),
      ]);

    const summary = summaryRows[0] ?? {
      salesAmount: 0,
      purchaseAmount: 0,
      activeOrders: 0,
      completedOrders: 0,
      walletBalance: 0,
      creditLimit: 0,
      usedCredit: 0,
      currency: "IRR",
      newPurchaseRequests: 0,
      pendingCreditPurchaseRequests: 0,
      confirmedPurchaseRequests: 0,
      cancelledPurchaseRequests: 0,
      activePurchaseInvoices: 0,
      historicalPurchaseInvoices: 0,
      paidPurchaseInvoices: 0,
      pendingPurchaseInvoices: 0,
      sentPurchaseInvoices: 0,
      todayPaidPurchaseInvoices: 0,
      todayActivePurchaseInvoices: 0,
      todayPendingPurchaseInvoices: 0,
      todaySentPurchaseInvoices: 0,
      outstandingPurchaseAmount: 0,
      todaySalesAmount: 0,
      yesterdaySalesAmount: 0,
      periodOrderCount: 0,
      previousOrderCount: 0,
      periodRevenue: 0,
      previousRevenue: 0,
      previousSalesAmount: 0,
      previousCompletedOrders: 0,
      currentMonthOrderCount: 0,
      previousMonthOrderCount: 0,
      currentMonthRevenue: 0,
      previousMonthRevenue: 0,
    };

    const managerSummary = {
      salesAmount: summary.salesAmount,
      purchaseAmount: summary.purchaseAmount,
      activeOrders: summary.activeOrders,
      completedOrders: summary.completedOrders,
      walletBalance: summary.walletBalance,
      creditLimit: summary.creditLimit,
      usedCredit: summary.usedCredit,
      availableCredit: Math.max(
        Number(summary.creditLimit) - Number(summary.usedCredit),
        0,
      ),
      currency: summary.currency ?? "IRR",
    };
    const percentChange = (current: number, previous: number) =>
      previous === 0
        ? current === 0
          ? 0
          : null
        : ((current - previous) / Math.abs(previous)) * 100;
    const fulfillmentRate =
      summary.periodOrderCount > 0
        ? (summary.completedOrders / summary.periodOrderCount) * 100
        : 0;
    const previousFulfillmentRate =
      summary.previousOrderCount > 0
        ? (summary.previousCompletedOrders / summary.previousOrderCount) * 100
        : 0;
    const averageOrderValue =
      summary.periodOrderCount > 0
        ? summary.salesAmount / summary.periodOrderCount
        : 0;
    const previousAverageOrderValue =
      summary.previousOrderCount > 0
        ? summary.previousSalesAmount / summary.previousOrderCount
        : 0;

    return {
      summary: managerSummary,
      managerSummary,
      managerKpis: {
        todaySalesAmount: summary.todaySalesAmount,
        todaySalesComparisonPercent: percentChange(
          summary.todaySalesAmount,
          summary.yesterdaySalesAmount,
        ),
        currentMonthOrderCount: summary.currentMonthOrderCount,
        currentMonthOrderComparisonPercent: percentChange(
          summary.currentMonthOrderCount,
          summary.previousMonthOrderCount,
        ),
        currentMonthRevenue: summary.currentMonthRevenue,
        currentMonthRevenueComparisonPercent: percentChange(
          summary.currentMonthRevenue,
          summary.previousMonthRevenue,
        ),
        periodOrderCount: summary.periodOrderCount,
        orderCountComparisonPercent: percentChange(
          summary.periodOrderCount,
          summary.previousOrderCount,
        ),
        periodRevenue: summary.periodRevenue,
        revenueComparisonPercent: percentChange(
          summary.periodRevenue,
          summary.previousRevenue,
        ),
        currency: summary.currency ?? "IRR",
      },
      sellerSummary: {
        newPurchaseRequests: summary.newPurchaseRequests,
        pendingCreditPurchaseRequests: summary.pendingCreditPurchaseRequests,
        confirmedPurchaseRequests: summary.confirmedPurchaseRequests,
        cancelledPurchaseRequests: summary.cancelledPurchaseRequests,
        activePurchaseInvoices: summary.activePurchaseInvoices,
        historicalPurchaseInvoices: summary.historicalPurchaseInvoices,
        paidPurchaseInvoices: summary.paidPurchaseInvoices,
        pendingPurchaseInvoices: summary.pendingPurchaseInvoices,
        sentPurchaseInvoices: summary.sentPurchaseInvoices,
        todayPaidPurchaseInvoices: summary.todayPaidPurchaseInvoices,
        todayActivePurchaseInvoices: summary.todayActivePurchaseInvoices,
        todayPendingPurchaseInvoices: summary.todayPendingPurchaseInvoices,
        todaySentPurchaseInvoices: summary.todaySentPurchaseInvoices,
        outstandingPurchaseAmount: summary.outstandingPurchaseAmount,
        walletBalance: summary.walletBalance,
        currency: summary.currency ?? "IRR",
      },
      salesTrend: [...salesTrend],
      recentOrders: [...recentOrders],
      topSuppliers: [...topSuppliers],
      topProducts: [...topProducts],
      managerPerformance: [
        {
          key: "sales",
          value: summary.salesAmount,
          previousValue: summary.previousSalesAmount,
          changePercent: percentChange(
            summary.salesAmount,
            summary.previousSalesAmount,
          ),
        },
        {
          key: "orders",
          value: summary.periodOrderCount,
          previousValue: summary.previousOrderCount,
          changePercent: percentChange(
            summary.periodOrderCount,
            summary.previousOrderCount,
          ),
        },
        {
          key: "averageOrderValue",
          value: averageOrderValue,
          previousValue: previousAverageOrderValue,
          changePercent: percentChange(
            averageOrderValue,
            previousAverageOrderValue,
          ),
        },
        {
          key: "fulfillmentRate",
          value: fulfillmentRate,
          previousValue: previousFulfillmentRate,
          changePercent: percentChange(
            fulfillmentRate,
            previousFulfillmentRate,
          ),
        },
      ],
    };
  }
}
