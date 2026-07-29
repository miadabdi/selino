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
};

type TrendRow = {
  date: string;
  amount: number;
  orderCount: number;
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
            ), 0)::float8 as purchase_amount
          from invoices i
          where i.created_at >= ${rangeFrom}
            and i.created_at < ${rangeTo}
            and (
              i.supplier_business_account_id = ${businessAccountId}
              or i.buyer_business_account_id = ${businessAccountId}
            )
        ),
        order_totals as (
          select
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
          order_totals,
          purchase_request_totals,
          purchase_invoice_totals,
          wallet_totals,
          credit_totals
      `),
        txContext.execute<TrendRow>(sql`
        select
          to_char(date_trunc('day', i.created_at), 'YYYY-MM-DD') as date,
          coalesce(sum(i.total_amount), 0)::float8 as amount,
          count(*)::int as "orderCount"
        from invoices i
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
          o.status,
          i.total_amount::float8 as "totalAmount",
          i.currency,
          o.created_at as "createdAt"
        from orders o
        inner join invoices i on i.id = o.invoice_id
        inner join business_accounts buyer
          on buyer.id = i.buyer_business_account_id
        inner join business_accounts supplier
          on supplier.id = i.supplier_business_account_id
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
          supplier.name as "supplierName",
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
        group by product.id, product.title, supplier.name
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

    return {
      summary: managerSummary,
      managerSummary,
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
    };
  }
}
