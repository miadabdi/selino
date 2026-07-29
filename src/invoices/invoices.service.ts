import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { throwHttpError } from "../common/http-error";
import type { ExportInvoicesDto } from "./dto/export-invoices.dto";
import type { ListInvoicesQueryDto } from "./dto/list-invoices-query.dto";
import type { UpdateInvoiceStatusDto } from "./dto/update-invoice-status.dto";
import { InvoiceExportService } from "./invoice-export.service";
import { InvoicesRepository } from "./invoices.repository";
import { OrdersRepository } from "../orders/orders.repository";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly repository: InvoicesRepository,
    private readonly invoiceExportService: InvoiceExportService,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  private getMembership(user: AuthenticatedUser, businessAccountId: number) {
    if (user.isAdmin === true || user.permissions.includes("*")) return null;
    const membership = user.businessMemberships.find(
      (item) => item.isActive && item.businessAccountId === businessAccountId,
    );
    if (!membership) {
      throwHttpError(HttpStatus.FORBIDDEN, "Active membership is required");
    }
    return membership;
  }

  private resolveReadScope(
    user: AuthenticatedUser,
    businessAccountId: number,
    view: "active" | "history" | "recent",
  ) {
    const membership = this.getMembership(user, businessAccountId);
    if (membership == null || membership.permissions.includes("*")) {
      return { requesterId: undefined };
    }

    if (view === "recent") {
      const hasActiveAll = membership.permissions.includes(
        "seller.invoices.active.read.all",
      );
      const hasHistoryAll = membership.permissions.includes(
        "seller.invoices.history.read.all",
      );
      if (hasActiveAll && hasHistoryAll) {
        return { requesterId: undefined };
      }

      const hasActiveOwn =
        hasActiveAll ||
        membership.permissions.includes("seller.invoices.active.read.own");
      const hasHistoryOwn =
        hasHistoryAll ||
        membership.permissions.includes("seller.invoices.history.read.own");
      if (hasActiveOwn && hasHistoryOwn) {
        return { requesterId: user.id };
      }

      throwHttpError(
        HttpStatus.FORBIDDEN,
        "Active and history invoice read permissions are required",
      );
    }

    const prefix = `seller.invoices.${view}.read`;
    if (membership.permissions.includes(`${prefix}.all`)) {
      return { requesterId: undefined };
    }
    if (membership.permissions.includes(`${prefix}.own`)) {
      return { requesterId: user.id };
    }

    throwHttpError(HttpStatus.FORBIDDEN, "Invoice read permission is required");
  }

  private assertInvoiceWithinScope(
    invoice: { buyerId: number },
    scope: { requesterId?: number },
  ) {
    if (scope.requesterId != null && invoice.buyerId !== scope.requesterId) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "Invoice read permission is required",
      );
    }
  }

  list(
    user: AuthenticatedUser,
    businessAccountId: number,
    query: ListInvoicesQueryDto,
  ) {
    const scope = this.resolveReadScope(user, businessAccountId, query.view);
    return this.repository.listForBusiness(
      businessAccountId,
      query,
      scope.requesterId,
    );
  }

  async get(user: AuthenticatedUser, businessAccountId: number, id: number) {
    this.getMembership(user, businessAccountId);
    const invoice = await this.repository.findForBusiness(
      businessAccountId,
      id,
    );
    if (!invoice) {
      throwHttpError(HttpStatus.NOT_FOUND, "Invoice not found");
    }
    if (
      invoice.supplierBusinessAccountId === businessAccountId &&
      invoice.status === "pending_credit_approval"
    ) {
      throwHttpError(HttpStatus.NOT_FOUND, "Invoice not found");
    }

    const direction =
      invoice.buyerBusinessAccountId === businessAccountId
        ? "purchase"
        : "sale";
    const isActive =
      direction === "purchase"
        ? ["pending_credit_approval", "pending", "sent", "delivered"].includes(
            invoice.status,
          )
        : ["pending", "sent"].includes(invoice.status);
    const scope = this.resolveReadScope(
      user,
      businessAccountId,
      isActive ? "active" : "history",
    );
    this.assertInvoiceWithinScope(invoice, scope);

    return invoice;
  }

  async export(
    user: AuthenticatedUser,
    businessAccountId: number,
    dto: ExportInvoicesDto,
  ) {
    const scope = this.resolveReadScope(user, businessAccountId, dto.view);
    const selectedInvoices = await this.repository.findManyForExport(
      businessAccountId,
      dto,
      scope.requesterId,
    );
    if (selectedInvoices.length !== dto.invoiceIds.length) {
      throwHttpError(
        HttpStatus.NOT_FOUND,
        "One or more invoices were not found",
      );
    }

    const buffer =
      await this.invoiceExportService.createWorkbook(selectedInvoices);
    const date = new Date().toISOString().slice(0, 10);
    return {
      buffer,
      filename: `invoices-${dto.direction}-${dto.view}-${date}.xlsx`,
    };
  }

  async updateStatus(
    user: AuthenticatedUser,
    businessAccountId: number,
    invoiceId: number,
    dto: UpdateInvoiceStatusDto,
  ) {
    const membership = this.getMembership(user, businessAccountId);
    if (
      membership &&
      !membership.permissions.includes("*") &&
      !membership.permissions.includes("manager.orders.manage")
    ) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "Order management permission is required",
      );
    }
    const invoice = await this.repository.findForBusiness(
      businessAccountId,
      invoiceId,
    );
    if (!invoice) {
      throwHttpError(HttpStatus.NOT_FOUND, "Invoice not found");
    }
    const transitions: Record<
      "pending" | "sent",
      Array<UpdateInvoiceStatusDto["status"]>
    > = {
      pending: ["sent", "cancelled"],
      sent: ["delivered", "cancelled"],
    };
    if (
      !(invoice.status in transitions) ||
      !transitions[invoice.status as "pending" | "sent"].includes(dto.status)
    ) {
      throwHttpError(HttpStatus.CONFLICT, "Invalid invoice status transition");
    }
    const updated = await this.repository.transaction(async (tx) => {
      const order =
        invoice.order ??
        (await this.ordersRepository.createFromInvoice(invoice, user.id, tx));
      if (!order) {
        throwHttpError(HttpStatus.CONFLICT, "Order could not be created");
      }
      const synchronizedOrder =
        await this.ordersRepository.synchronizeOrderForInvoiceStatus(
          invoice.id,
          dto.status,
          user.id,
          dto.reason,
          tx,
        );
      if (!synchronizedOrder) {
        throwHttpError(
          HttpStatus.CONFLICT,
          "Invoice status conflicts with the order lifecycle",
        );
      }
      return this.repository.transitionStatus(
        invoiceId,
        invoice.status as "pending" | "sent",
        dto.status,
        user.id,
        dto.reason ?? null,
        tx,
      );
    });
    if (!updated) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "Invoice status changed concurrently",
      );
    }
    return updated;
  }
}
