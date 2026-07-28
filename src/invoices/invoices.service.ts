import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { throwHttpError } from "../common/http-error";
import type { ExportInvoicesDto } from "./dto/export-invoices.dto";
import type { ListInvoicesQueryDto } from "./dto/list-invoices-query.dto";
import { InvoiceExportService } from "./invoice-export.service";
import { InvoicesRepository } from "./invoices.repository";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly repository: InvoicesRepository,
    private readonly invoiceExportService: InvoiceExportService,
  ) {}

  private getMembership(user: AuthenticatedUser, businessAccountId: number) {
    if (user.isAdmin === true) return null;
    const membership = user.businessMemberships.find(
      (item) => item.isActive && item.businessAccountId === businessAccountId,
    );
    if (!membership) {
      throwHttpError(HttpStatus.FORBIDDEN, "Active membership is required");
    }
    return membership;
  }

  private assertPermission(
    user: AuthenticatedUser,
    businessAccountId: number,
    permissions: string[],
  ) {
    const membership = this.getMembership(user, businessAccountId);
    if (
      membership &&
      !membership.permissions.includes("*") &&
      !permissions.some((permission) =>
        membership.permissions.includes(permission),
      )
    ) {
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
    this.assertPermission(user, businessAccountId, [
      query.view === "active"
        ? "seller.invoices.active.read"
        : "seller.invoices.history.read",
    ]);
    return this.repository.listForBusiness(businessAccountId, query);
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
        ? ["pending_credit_approval", "pending", "sent"].includes(
            invoice.status,
          )
        : ["pending", "sent"].includes(invoice.status);
    this.assertPermission(user, businessAccountId, [
      isActive ? "seller.invoices.active.read" : "seller.invoices.history.read",
    ]);

    return invoice;
  }

  async export(
    user: AuthenticatedUser,
    businessAccountId: number,
    dto: ExportInvoicesDto,
  ) {
    this.assertPermission(user, businessAccountId, [
      dto.view === "active"
        ? "seller.invoices.active.read"
        : "seller.invoices.history.read",
    ]);
    const selectedInvoices = await this.repository.findManyForExport(
      businessAccountId,
      dto,
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
}
