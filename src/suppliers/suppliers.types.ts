import type { SupplierLinkStatus } from "./dto/list-suppliers-query.dto.js";

export type SupplierLink = {
  id: number;
  buyerBusinessAccountId: number;
  supplierBusinessAccountId: number;
  supplierName: string;
  supplierSlug: string | null;
  supplierDescription: string | null;
  supplierLogoFileId: number | null;
  status: SupplierLinkStatus;
  notes: string | null;
  invoiceCount: number;
  orderCount: number;
  deliveredOrderCount: number;
  totalPurchased: number;
  creditLimit: number;
  usedCredit: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PaginatedSuppliers = {
  items: SupplierLink[];
  page: number;
  limit: number;
  total: number;
};
