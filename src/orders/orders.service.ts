import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import {
  assertBusinessPermission,
  findMembershipWithPermission,
} from "../auth/permissions";
import { throwHttpError } from "../common/http-error";
import type { ListOrdersQueryDto } from "./dto/list-orders-query.dto";
import type { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrdersRepository } from "./orders.repository";

const transitions = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
} as const;

@Injectable()
export class OrdersService {
  constructor(private readonly repository: OrdersRepository) {}

  async list(
    businessAccountId: number,
    user: AuthenticatedUser,
    query: ListOrdersQueryDto,
  ) {
    assertBusinessPermission(user, businessAccountId, "manager.orders.track");
    if (
      user.isAdmin === true ||
      user.permissions.includes("*") ||
      findMembershipWithPermission(
        user,
        "manager.orders.manage",
        businessAccountId,
      )
    ) {
      await this.reconcileApprovedInvoices(businessAccountId, user.id);
    }
    return this.repository.listForBusiness(businessAccountId, query);
  }

  async get(
    businessAccountId: number,
    orderId: number,
    user: AuthenticatedUser,
  ) {
    assertBusinessPermission(user, businessAccountId, "manager.orders.track");
    const order = await this.repository.findForBusiness(
      businessAccountId,
      orderId,
    );
    if (!order) throwHttpError(HttpStatus.NOT_FOUND, "Order not found");
    return order;
  }

  async deriveFromConfirmedInvoice(
    businessAccountId: number,
    invoiceId: number,
    user: AuthenticatedUser,
  ) {
    assertBusinessPermission(user, businessAccountId, "manager.orders.manage");
    return this.repository.transaction(async (tx) => {
      const existing = await this.repository.findByInvoiceId(invoiceId, tx);
      if (existing) return existing;

      const invoice = await this.repository.findInvoiceForDerivation(
        invoiceId,
        tx,
      );
      if (
        !invoice ||
        (invoice.buyerBusinessAccountId !== businessAccountId &&
          invoice.supplierBusinessAccountId !== businessAccountId)
      ) {
        throwHttpError(HttpStatus.NOT_FOUND, "Invoice not found");
      }
      if (
        !invoice.purchaseRequest ||
        invoice.purchaseRequest.status !== "confirmed" ||
        ["pending_credit_approval", "rejected", "expired"].includes(
          invoice.status,
        )
      ) {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Only confirmed purchase invoices can produce orders",
        );
      }
      const order = await this.repository.createFromInvoice(
        invoice,
        user.id,
        tx,
      );
      if (!order) {
        throwHttpError(HttpStatus.CONFLICT, "Order could not be derived");
      }
      return order;
    });
  }

  async updateStatus(
    businessAccountId: number,
    orderId: number,
    user: AuthenticatedUser,
    dto: UpdateOrderStatusDto,
  ) {
    assertBusinessPermission(user, businessAccountId, "manager.orders.manage");
    return this.repository.transaction(async (tx) => {
      const order = await this.repository.findForBusinessForUpdate(
        businessAccountId,
        orderId,
        tx,
      );
      if (!order) throwHttpError(HttpStatus.NOT_FOUND, "Order not found");
      if (order.status === dto.status) return order;
      const allowed = transitions[order.status];
      if (!(allowed as readonly string[]).includes(dto.status)) {
        throwHttpError(
          HttpStatus.CONFLICT,
          `Order cannot transition from ${order.status} to ${dto.status}`,
        );
      }
      const updated = await this.repository.updateStatus(
        order.id,
        order.status,
        dto.status,
        user.id,
        dto.note,
        tx,
      );
      if (!updated) {
        throwHttpError(HttpStatus.CONFLICT, "Order status update conflict");
      }
      return updated;
    });
  }

  private reconcileApprovedInvoices(
    businessAccountId: number,
    actorId: number,
  ) {
    return this.repository.transaction(async (tx) => {
      const invoices = await this.repository.findEligibleInvoicesForBusiness(
        businessAccountId,
        tx,
      );
      for (const invoice of invoices) {
        if (invoice.purchaseRequest?.status !== "confirmed") continue;
        const order =
          invoice.order ??
          (await this.repository.createFromInvoice(invoice, actorId, tx));
        if (order) {
          await this.repository.synchronizeInvoiceForOrder(
            invoice.id,
            order.status,
            actorId,
            "Reconciled from order lifecycle",
            tx,
          );
        }
      }
    });
  }
}
