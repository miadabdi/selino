import { relations } from "drizzle-orm";
import { authOtps } from "./auth-otps.schema";
import { brands } from "./brands.schema";
import { categories } from "./categories.schema";
import { files } from "./files.schema";
import { invoiceItems } from "./invoice-items.schema";
import { invoices } from "./invoices.schema";
import { notificationDeliveries } from "./notification-deliveries.schema";
import { notifications } from "./notifications.schema";
import { permissions } from "./permissions.schema";
import { productImages } from "./product-images.schema";
import { products } from "./products.schema";
import { purchaseRequestItems } from "./purchase-request-items.schema";
import { purchaseRequests } from "./purchase-requests.schema";
import { refreshTokens } from "./refresh-tokens.schema";
import { rolePermissions } from "./role-permissions.schema";
import { roles } from "./roles.schema";
import { storeInventories } from "./store-inventories.schema";
import { storeInventoryTransactions } from "./store-inventory-transactions.schema";
import { storeMembers } from "./store-members.schema";
import { stores } from "./stores.schema";
import { users } from "./users.schema";

export const usersRelations = relations(users, ({ many }) => ({
  authOtps: many(authOtps),
  files: many(files),
  notifications: many(notifications),
  refreshTokens: many(refreshTokens),
  purchaseRequests: many(purchaseRequests),
  invoices: many(invoices),
  stores: many(stores),
  storeMemberships: many(storeMembers),
  storeInventories: many(storeInventories),
  storeInventoryTransactions: many(storeInventoryTransactions),
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
  storesWithLogo: many(stores),
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

export const storesRelations = relations(stores, ({ one, many }) => ({
  logoFile: one(files, {
    fields: [stores.logoFileId],
    references: [files.id],
  }),
  owner: one(users, {
    fields: [stores.ownerId],
    references: [users.id],
  }),
  members: many(storeMembers),
  inventories: many(storeInventories),
  purchaseRequests: many(purchaseRequests),
  invoices: many(invoices),
}));

export const storeMembersRelations = relations(storeMembers, ({ one }) => ({
  store: one(stores, {
    fields: [storeMembers.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [storeMembers.userId],
    references: [users.id],
  }),
}));

export const storeInventoriesRelations = relations(
  storeInventories,
  ({ one, many }) => ({
    store: one(stores, {
      fields: [storeInventories.storeId],
      references: [stores.id],
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
    store: one(stores, {
      fields: [purchaseRequests.storeId],
      references: [stores.id],
    }),
    items: many(purchaseRequestItems),
    invoices: many(invoices),
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
  store: one(stores, {
    fields: [invoices.storeId],
    references: [stores.id],
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

export const notificationsRelations = relations(
  notifications,
  ({ one, many }) => ({
    user: one(users, {
      fields: [notifications.userId],
      references: [users.id],
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
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
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
