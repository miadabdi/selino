import { relations } from "drizzle-orm";
import { authOtps } from "./auth-otps.schema";
import { brands } from "./brands.schema";
import { businessAccounts } from "./business-accounts.schema";
import { businessAddresses } from "./business-addresses.schema";
import { businessMembers } from "./business-members.schema";
import { businessSupplierLinks } from "./business-supplier-links.schema";
import { businessSubscriptions } from "./business-subscriptions.schema";
import { businessWallets } from "./business-wallets.schema";
import { categories } from "./categories.schema";
import { featurePermissions } from "./feature-permissions.schema";
import { features } from "./features.schema";
import { files } from "./files.schema";
import { invoiceItems } from "./invoice-items.schema";
import { invoiceStatusEvents } from "./invoice-status-events.schema";
import { invoices } from "./invoices.schema";
import { notificationDeliveries } from "./notification-deliveries.schema";
import { notifications } from "./notifications.schema";
import { notificationPreferences } from "./notification-preferences.schema";
import { orders } from "./orders.schema";
import { orderStatusEvents } from "./order-status-events.schema";
import { packageFeatures } from "./package-features.schema";
import { packages } from "./packages.schema";
import { permissions } from "./permissions.schema";
import { productImages } from "./product-images.schema";
import { products } from "./products.schema";
import { purchaseRequestItems } from "./purchase-request-items.schema";
import { purchaseRequestStatusEvents } from "./purchase-request-status-events.schema";
import { purchaseRequests } from "./purchase-requests.schema";
import { reportExports } from "./report-exports.schema";
import { refreshTokens } from "./refresh-tokens.schema";
import { rolePermissions } from "./role-permissions.schema";
import { roles } from "./roles.schema";
import { storeInventories } from "./store-inventories.schema";
import { storeInventoryTransactions } from "./store-inventory-transactions.schema";
import { shipments } from "./shipments.schema";
import { shipmentLocationEvents } from "./shipment-location-events.schema";
import { payments } from "./payments.schema";
import { supportTickets } from "./support-tickets.schema";
import { supportTicketMessages } from "./support-ticket-messages.schema";
import { supportTicketAttachments } from "./support-ticket-attachments.schema";
import { walletTransactions } from "./wallet-transactions.schema";
import {
  tradeCreditAgreementSignatures,
  tradeCreditAgreements,
  tradeCreditAuditLogs,
  tradeCreditApprovalRequests,
  tradeCreditSettlements,
  tradeCreditTransactions,
} from "./trade-credit-agreements.schema";
import { users } from "./users.schema";

export const usersRelations = relations(users, ({ many }) => ({
  authOtps: many(authOtps),
  files: many(files),
  notifications: many(notifications),
  refreshTokens: many(refreshTokens),
  purchaseRequests: many(purchaseRequests),
  invoices: many(invoices),
  businessMemberships: many(businessMembers),
  storeInventories: many(storeInventories),
  storeInventoryTransactions: many(storeInventoryTransactions),
  createdTradeCreditAgreements: many(tradeCreditAgreements),
  tradeCreditTransactions: many(tradeCreditTransactions),
  confirmedTradeCreditSettlements: many(tradeCreditSettlements),
  tradeCreditAgreementSignatures: many(tradeCreditAgreementSignatures),
  tradeCreditAuditLogs: many(tradeCreditAuditLogs),
  createdBusinessAddresses: many(businessAddresses, {
    relationName: "business_address_created_by",
  }),
  updatedBusinessAddresses: many(businessAddresses, {
    relationName: "business_address_updated_by",
  }),
  walletTransactions: many(walletTransactions),
  payments: many(payments),
  orderStatusEvents: many(orderStatusEvents),
  shipmentLocationEvents: many(shipmentLocationEvents),
  reportExports: many(reportExports),
  notificationPreferences: many(notificationPreferences),
  supportTickets: many(supportTickets, {
    relationName: "support_ticket_requester",
  }),
  assignedSupportTickets: many(supportTickets, {
    relationName: "support_ticket_assignee",
  }),
  supportTicketMessages: many(supportTicketMessages),
  supportTicketAttachments: many(supportTicketAttachments),
  requestedTradeCreditApprovals: many(tradeCreditApprovalRequests, {
    relationName: "trade_credit_approval_requested_by",
  }),
  approvedTradeCreditApprovals: many(tradeCreditApprovalRequests, {
    relationName: "trade_credit_approval_approved_by",
  }),
  rejectedTradeCreditApprovals: many(tradeCreditApprovalRequests, {
    relationName: "trade_credit_approval_rejected_by",
  }),
}));

export const authOtpsRelations = relations(authOtps, ({ one }) => ({
  user: one(users, {
    fields: [authOtps.userId],
    references: [users.id],
  }),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  uploadedByUser: one(users, {
    fields: [files.uploadedBy],
    references: [users.id],
  }),
  productsAsDefaultImage: many(products),
  productImages: many(productImages),
  businessAccountsWithLogo: many(businessAccounts),
  reportExports: many(reportExports),
  supportTicketAttachments: many(supportTicketAttachments),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent",
  }),
  children: many(categories, {
    relationName: "category_parent",
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  defaultImageFile: one(files, {
    fields: [products.defaultImageFileId],
    references: [files.id],
  }),
  images: many(productImages),
  storeInventories: many(storeInventories),
  purchaseRequestItems: many(purchaseRequestItems),
  invoiceItems: many(invoiceItems),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
  file: one(files, {
    fields: [productImages.fileId],
    references: [files.id],
  }),
}));

export const businessAccountsRelations = relations(
  businessAccounts,
  ({ one, many }) => ({
    logoFile: one(files, {
      fields: [businessAccounts.logoFileId],
      references: [files.id],
    }),
    members: many(businessMembers),
    inventories: many(storeInventories),
    purchaseRequestsAsBuyer: many(purchaseRequests),
    invoicesAsBuyer: many(invoices, { relationName: "invoice_buyer_business" }),
    invoicesAsSupplier: many(invoices, {
      relationName: "invoice_supplier_business",
    }),
    subscriptions: many(businessSubscriptions),
    tradeCreditAgreementsAsBuyer: many(tradeCreditAgreements, {
      relationName: "trade_credit_agreement_buyer",
    }),
    tradeCreditAgreementsAsSupplier: many(tradeCreditAgreements, {
      relationName: "trade_credit_agreement_supplier",
    }),
    tradeCreditAgreementSignatures: many(tradeCreditAgreementSignatures),
    tradeCreditAuditLogs: many(tradeCreditAuditLogs),
    tradeCreditApprovalRequests: many(tradeCreditApprovalRequests),
    addresses: many(businessAddresses),
    wallets: many(businessWallets),
    supplierLinksAsBuyer: many(businessSupplierLinks, {
      relationName: "business_supplier_link_buyer",
    }),
    supplierLinksAsSupplier: many(businessSupplierLinks, {
      relationName: "business_supplier_link_supplier",
    }),
    ordersAsBuyer: many(orders, { relationName: "order_buyer_business" }),
    ordersAsSupplier: many(orders, {
      relationName: "order_supplier_business",
    }),
    payments: many(payments),
    reportExports: many(reportExports),
    notificationPreferences: many(notificationPreferences),
    supportTickets: many(supportTickets),
    notifications: many(notifications),
  }),
);

export const businessMembersRelations = relations(
  businessMembers,
  ({ one }) => ({
    businessAccount: one(businessAccounts, {
      fields: [businessMembers.businessAccountId],
      references: [businessAccounts.id],
    }),
    user: one(users, {
      fields: [businessMembers.userId],
      references: [users.id],
    }),
    role: one(roles, {
      fields: [businessMembers.roleId],
      references: [roles.id],
    }),
  }),
);

export const storeInventoriesRelations = relations(
  storeInventories,
  ({ one, many }) => ({
    businessAccount: one(businessAccounts, {
      fields: [storeInventories.businessAccountId],
      references: [businessAccounts.id],
    }),
    product: one(products, {
      fields: [storeInventories.productId],
      references: [products.id],
    }),
    createdByUser: one(users, {
      fields: [storeInventories.createdBy],
      references: [users.id],
    }),
    transactions: many(storeInventoryTransactions),
    purchaseRequestItems: many(purchaseRequestItems),
    invoiceItems: many(invoiceItems),
  }),
);

export const storeInventoryTransactionsRelations = relations(
  storeInventoryTransactions,
  ({ one }) => ({
    storeInventory: one(storeInventories, {
      fields: [storeInventoryTransactions.storeInventoryId],
      references: [storeInventories.id],
    }),
    changedByUser: one(users, {
      fields: [storeInventoryTransactions.changedBy],
      references: [users.id],
    }),
  }),
);

export const purchaseRequestsRelations = relations(
  purchaseRequests,
  ({ one, many }) => ({
    requester: one(users, {
      fields: [purchaseRequests.requesterId],
      references: [users.id],
    }),
    buyerBusinessAccount: one(businessAccounts, {
      fields: [purchaseRequests.buyerBusinessAccountId],
      references: [businessAccounts.id],
    }),
    items: many(purchaseRequestItems),
    invoices: many(invoices),
    tradeCreditApprovalRequests: many(tradeCreditApprovalRequests),
    statusEvents: many(purchaseRequestStatusEvents),
    orders: many(orders),
  }),
);

export const purchaseRequestItemsRelations = relations(
  purchaseRequestItems,
  ({ one }) => ({
    purchaseRequest: one(purchaseRequests, {
      fields: [purchaseRequestItems.purchaseRequestId],
      references: [purchaseRequests.id],
    }),
    product: one(products, {
      fields: [purchaseRequestItems.productId],
      references: [products.id],
    }),
    storeInventory: one(storeInventories, {
      fields: [purchaseRequestItems.storeInventoryId],
      references: [storeInventories.id],
    }),
  }),
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  supplierBusinessAccount: one(businessAccounts, {
    fields: [invoices.supplierBusinessAccountId],
    references: [businessAccounts.id],
    relationName: "invoice_supplier_business",
  }),
  buyerBusinessAccount: one(businessAccounts, {
    fields: [invoices.buyerBusinessAccountId],
    references: [businessAccounts.id],
    relationName: "invoice_buyer_business",
  }),
  buyer: one(users, {
    fields: [invoices.buyerId],
    references: [users.id],
  }),
  purchaseRequest: one(purchaseRequests, {
    fields: [invoices.purchaseRequestId],
    references: [purchaseRequests.id],
  }),
  items: many(invoiceItems),
  statusEvents: many(invoiceStatusEvents),
  order: one(orders),
  payments: many(payments),
  walletTransactions: many(walletTransactions),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  product: one(products, {
    fields: [invoiceItems.productId],
    references: [products.id],
  }),
  storeInventory: one(storeInventories, {
    fields: [invoiceItems.storeInventoryId],
    references: [storeInventories.id],
  }),
}));

export const tradeCreditAgreementsRelations = relations(
  tradeCreditAgreements,
  ({ one, many }) => ({
    buyerBusinessAccount: one(businessAccounts, {
      fields: [tradeCreditAgreements.buyerBusinessAccountId],
      references: [businessAccounts.id],
      relationName: "trade_credit_agreement_buyer",
    }),
    supplierBusinessAccount: one(businessAccounts, {
      fields: [tradeCreditAgreements.supplierBusinessAccountId],
      references: [businessAccounts.id],
      relationName: "trade_credit_agreement_supplier",
    }),
    createdByUser: one(users, {
      fields: [tradeCreditAgreements.createdBy],
      references: [users.id],
    }),
    transactions: many(tradeCreditTransactions),
    settlements: many(tradeCreditSettlements),
    signatures: many(tradeCreditAgreementSignatures),
    auditLogs: many(tradeCreditAuditLogs),
    approvalRequests: many(tradeCreditApprovalRequests),
  }),
);

export const tradeCreditApprovalRequestsRelations = relations(
  tradeCreditApprovalRequests,
  ({ one }) => ({
    agreement: one(tradeCreditAgreements, {
      fields: [tradeCreditApprovalRequests.agreementId],
      references: [tradeCreditAgreements.id],
    }),
    purchaseRequest: one(purchaseRequests, {
      fields: [tradeCreditApprovalRequests.purchaseRequestId],
      references: [purchaseRequests.id],
    }),
    invoice: one(invoices, {
      fields: [tradeCreditApprovalRequests.invoiceId],
      references: [invoices.id],
    }),
    requestedByUser: one(users, {
      fields: [tradeCreditApprovalRequests.requestedBy],
      references: [users.id],
      relationName: "trade_credit_approval_requested_by",
    }),
    ownerBusinessAccount: one(businessAccounts, {
      fields: [tradeCreditApprovalRequests.ownerBusinessAccountId],
      references: [businessAccounts.id],
    }),
    approvedByUser: one(users, {
      fields: [tradeCreditApprovalRequests.approvedBy],
      references: [users.id],
      relationName: "trade_credit_approval_approved_by",
    }),
    rejectedByUser: one(users, {
      fields: [tradeCreditApprovalRequests.rejectedBy],
      references: [users.id],
      relationName: "trade_credit_approval_rejected_by",
    }),
  }),
);

export const tradeCreditTransactionsRelations = relations(
  tradeCreditTransactions,
  ({ one }) => ({
    agreement: one(tradeCreditAgreements, {
      fields: [tradeCreditTransactions.agreementId],
      references: [tradeCreditAgreements.id],
    }),
    createdByUser: one(users, {
      fields: [tradeCreditTransactions.createdBy],
      references: [users.id],
    }),
  }),
);

export const tradeCreditSettlementsRelations = relations(
  tradeCreditSettlements,
  ({ one }) => ({
    agreement: one(tradeCreditAgreements, {
      fields: [tradeCreditSettlements.agreementId],
      references: [tradeCreditAgreements.id],
    }),
    confirmedByUser: one(users, {
      fields: [tradeCreditSettlements.confirmedBy],
      references: [users.id],
    }),
  }),
);

export const tradeCreditAgreementSignaturesRelations = relations(
  tradeCreditAgreementSignatures,
  ({ one }) => ({
    agreement: one(tradeCreditAgreements, {
      fields: [tradeCreditAgreementSignatures.agreementId],
      references: [tradeCreditAgreements.id],
    }),
    businessAccount: one(businessAccounts, {
      fields: [tradeCreditAgreementSignatures.businessAccountId],
      references: [businessAccounts.id],
    }),
    signedByUser: one(users, {
      fields: [tradeCreditAgreementSignatures.signedBy],
      references: [users.id],
    }),
  }),
);

export const tradeCreditAuditLogsRelations = relations(
  tradeCreditAuditLogs,
  ({ one }) => ({
    agreement: one(tradeCreditAgreements, {
      fields: [tradeCreditAuditLogs.agreementId],
      references: [tradeCreditAgreements.id],
    }),
    actorUser: one(users, {
      fields: [tradeCreditAuditLogs.actorUserId],
      references: [users.id],
    }),
    actorBusinessAccount: one(businessAccounts, {
      fields: [tradeCreditAuditLogs.actorBusinessAccountId],
      references: [businessAccounts.id],
    }),
  }),
);

export const businessAddressesRelations = relations(
  businessAddresses,
  ({ one, many }) => ({
    businessAccount: one(businessAccounts, {
      fields: [businessAddresses.businessAccountId],
      references: [businessAccounts.id],
    }),
    createdByUser: one(users, {
      fields: [businessAddresses.createdBy],
      references: [users.id],
      relationName: "business_address_created_by",
    }),
    updatedByUser: one(users, {
      fields: [businessAddresses.updatedBy],
      references: [users.id],
      relationName: "business_address_updated_by",
    }),
    shippingOrders: many(orders),
    originShipments: many(shipments, {
      relationName: "shipment_origin_address",
    }),
    destinationShipments: many(shipments, {
      relationName: "shipment_destination_address",
    }),
  }),
);

export const businessSupplierLinksRelations = relations(
  businessSupplierLinks,
  ({ one }) => ({
    buyerBusinessAccount: one(businessAccounts, {
      fields: [businessSupplierLinks.buyerBusinessAccountId],
      references: [businessAccounts.id],
      relationName: "business_supplier_link_buyer",
    }),
    supplierBusinessAccount: one(businessAccounts, {
      fields: [businessSupplierLinks.supplierBusinessAccountId],
      references: [businessAccounts.id],
      relationName: "business_supplier_link_supplier",
    }),
    requestedByUser: one(users, {
      fields: [businessSupplierLinks.requestedBy],
      references: [users.id],
      relationName: "business_supplier_link_requested_by",
    }),
    approvedByUser: one(users, {
      fields: [businessSupplierLinks.approvedBy],
      references: [users.id],
      relationName: "business_supplier_link_approved_by",
    }),
  }),
);

export const businessWalletsRelations = relations(
  businessWallets,
  ({ one, many }) => ({
    businessAccount: one(businessAccounts, {
      fields: [businessWallets.businessAccountId],
      references: [businessAccounts.id],
    }),
    transactions: many(walletTransactions),
    payments: many(payments),
  }),
);

export const walletTransactionsRelations = relations(
  walletTransactions,
  ({ one }) => ({
    wallet: one(businessWallets, {
      fields: [walletTransactions.walletId],
      references: [businessWallets.id],
    }),
    invoice: one(invoices, {
      fields: [walletTransactions.invoiceId],
      references: [invoices.id],
    }),
    createdByUser: one(users, {
      fields: [walletTransactions.createdBy],
      references: [users.id],
    }),
  }),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  businessAccount: one(businessAccounts, {
    fields: [payments.businessAccountId],
    references: [businessAccounts.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  wallet: one(businessWallets, {
    fields: [payments.walletId],
    references: [businessWallets.id],
  }),
  createdByUser: one(users, {
    fields: [payments.createdBy],
    references: [users.id],
  }),
}));

export const purchaseRequestStatusEventsRelations = relations(
  purchaseRequestStatusEvents,
  ({ one }) => ({
    purchaseRequest: one(purchaseRequests, {
      fields: [purchaseRequestStatusEvents.purchaseRequestId],
      references: [purchaseRequests.id],
    }),
    changedByUser: one(users, {
      fields: [purchaseRequestStatusEvents.changedBy],
      references: [users.id],
    }),
  }),
);

export const invoiceStatusEventsRelations = relations(
  invoiceStatusEvents,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceStatusEvents.invoiceId],
      references: [invoices.id],
    }),
    changedByUser: one(users, {
      fields: [invoiceStatusEvents.changedBy],
      references: [users.id],
    }),
  }),
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  invoice: one(invoices, {
    fields: [orders.invoiceId],
    references: [invoices.id],
  }),
  purchaseRequest: one(purchaseRequests, {
    fields: [orders.purchaseRequestId],
    references: [purchaseRequests.id],
  }),
  buyerBusinessAccount: one(businessAccounts, {
    fields: [orders.buyerBusinessAccountId],
    references: [businessAccounts.id],
    relationName: "order_buyer_business",
  }),
  supplierBusinessAccount: one(businessAccounts, {
    fields: [orders.supplierBusinessAccountId],
    references: [businessAccounts.id],
    relationName: "order_supplier_business",
  }),
  shippingAddress: one(businessAddresses, {
    fields: [orders.shippingAddressId],
    references: [businessAddresses.id],
  }),
  createdByUser: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  statusEvents: many(orderStatusEvents),
  shipments: many(shipments),
}));

export const orderStatusEventsRelations = relations(
  orderStatusEvents,
  ({ one }) => ({
    order: one(orders, {
      fields: [orderStatusEvents.orderId],
      references: [orders.id],
    }),
    changedByUser: one(users, {
      fields: [orderStatusEvents.changedBy],
      references: [users.id],
    }),
  }),
);

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
  originAddress: one(businessAddresses, {
    fields: [shipments.originAddressId],
    references: [businessAddresses.id],
    relationName: "shipment_origin_address",
  }),
  destinationAddress: one(businessAddresses, {
    fields: [shipments.destinationAddressId],
    references: [businessAddresses.id],
    relationName: "shipment_destination_address",
  }),
  createdByUser: one(users, {
    fields: [shipments.createdBy],
    references: [users.id],
  }),
  locationEvents: many(shipmentLocationEvents),
}));

export const shipmentLocationEventsRelations = relations(
  shipmentLocationEvents,
  ({ one }) => ({
    shipment: one(shipments, {
      fields: [shipmentLocationEvents.shipmentId],
      references: [shipments.id],
    }),
    recordedByUser: one(users, {
      fields: [shipmentLocationEvents.recordedBy],
      references: [users.id],
    }),
  }),
);

export const reportExportsRelations = relations(reportExports, ({ one }) => ({
  businessAccount: one(businessAccounts, {
    fields: [reportExports.businessAccountId],
    references: [businessAccounts.id],
  }),
  requestedByUser: one(users, {
    fields: [reportExports.requestedBy],
    references: [users.id],
  }),
  file: one(files, {
    fields: [reportExports.fileId],
    references: [files.id],
  }),
}));

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationPreferences.userId],
      references: [users.id],
    }),
    businessAccount: one(businessAccounts, {
      fields: [notificationPreferences.businessAccountId],
      references: [businessAccounts.id],
    }),
  }),
);

export const supportTicketsRelations = relations(
  supportTickets,
  ({ one, many }) => ({
    businessAccount: one(businessAccounts, {
      fields: [supportTickets.businessAccountId],
      references: [businessAccounts.id],
    }),
    requester: one(users, {
      fields: [supportTickets.requesterId],
      references: [users.id],
      relationName: "support_ticket_requester",
    }),
    assignee: one(users, {
      fields: [supportTickets.assignedTo],
      references: [users.id],
      relationName: "support_ticket_assignee",
    }),
    messages: many(supportTicketMessages),
    attachments: many(supportTicketAttachments),
  }),
);

export const supportTicketMessagesRelations = relations(
  supportTicketMessages,
  ({ one, many }) => ({
    ticket: one(supportTickets, {
      fields: [supportTicketMessages.ticketId],
      references: [supportTickets.id],
    }),
    author: one(users, {
      fields: [supportTicketMessages.authorId],
      references: [users.id],
    }),
    attachments: many(supportTicketAttachments),
  }),
);

export const supportTicketAttachmentsRelations = relations(
  supportTicketAttachments,
  ({ one }) => ({
    ticket: one(supportTickets, {
      fields: [supportTicketAttachments.ticketId],
      references: [supportTickets.id],
    }),
    message: one(supportTicketMessages, {
      fields: [supportTicketAttachments.messageId],
      references: [supportTicketMessages.id],
    }),
    file: one(files, {
      fields: [supportTicketAttachments.fileId],
      references: [files.id],
    }),
    uploadedByUser: one(users, {
      fields: [supportTicketAttachments.uploadedBy],
      references: [users.id],
    }),
  }),
);

export const notificationsRelations = relations(
  notifications,
  ({ one, many }) => ({
    user: one(users, {
      fields: [notifications.userId],
      references: [users.id],
    }),
    businessAccount: one(businessAccounts, {
      fields: [notifications.businessAccountId],
      references: [businessAccounts.id],
    }),
    deliveries: many(notificationDeliveries),
  }),
);

export const notificationDeliveriesRelations = relations(
  notificationDeliveries,
  ({ one }) => ({
    notification: one(notifications, {
      fields: [notificationDeliveries.notificationId],
      references: [notifications.id],
    }),
  }),
);

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  businessMembers: many(businessMembers),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  featurePermissions: many(featurePermissions),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.id],
    }),
  }),
);

export const packagesRelations = relations(packages, ({ many }) => ({
  packageFeatures: many(packageFeatures),
  businessSubscriptions: many(businessSubscriptions),
}));

export const featuresRelations = relations(features, ({ many }) => ({
  packageFeatures: many(packageFeatures),
  featurePermissions: many(featurePermissions),
}));

export const packageFeaturesRelations = relations(
  packageFeatures,
  ({ one }) => ({
    package: one(packages, {
      fields: [packageFeatures.packageId],
      references: [packages.id],
    }),
    feature: one(features, {
      fields: [packageFeatures.featureId],
      references: [features.id],
    }),
  }),
);

export const featurePermissionsRelations = relations(
  featurePermissions,
  ({ one }) => ({
    feature: one(features, {
      fields: [featurePermissions.featureId],
      references: [features.id],
    }),
    permission: one(permissions, {
      fields: [featurePermissions.permissionId],
      references: [permissions.id],
    }),
  }),
);

export const businessSubscriptionsRelations = relations(
  businessSubscriptions,
  ({ one }) => ({
    businessAccount: one(businessAccounts, {
      fields: [businessSubscriptions.businessAccountId],
      references: [businessAccounts.id],
    }),
    package: one(packages, {
      fields: [businessSubscriptions.packageId],
      references: [packages.id],
    }),
  }),
);

export const refreshTokensRelations = relations(
  refreshTokens,
  ({ one, many }) => ({
    user: one(users, {
      fields: [refreshTokens.userId],
      references: [users.id],
    }),
    replacedByToken: one(refreshTokens, {
      fields: [refreshTokens.replacedBy],
      references: [refreshTokens.id],
      relationName: "refresh_token_replaced_by",
    }),
    replacedTokens: many(refreshTokens, {
      relationName: "refresh_token_replaced_by",
    }),
  }),
);
