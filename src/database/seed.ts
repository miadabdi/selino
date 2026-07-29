import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  brands,
  businessAccounts,
  businessMembers,
  businessSubscriptions,
  categories,
  featurePermissions,
  features,
  packageFeatures,
  packages,
  permissions,
  products,
  rolePermissions,
  roles,
  storeInventories,
  users,
  type Brand,
  type BusinessAccount,
  type Category,
  type Feature,
  type NewBrand,
  type NewCategory,
  type NewProduct,
  type Package,
  type Permission,
  type Product,
  type Role,
  type User,
} from "./schema/index.js";
import * as schema from "./schema/index.js";

config();

type SeedDb = PostgresJsDatabase<typeof schema>;

const permissionKeys = [
  "*",
  "seller.dashboard.overview",
  "seller.purchase-requests.page",
  "seller.purchase-requests.read.own",
  "seller.purchase-requests.read.all",
  "seller.purchase-requests.create",
  "seller.purchase-requests.cancel.own",
  "seller.purchase-requests.cancel.all",
  "seller.purchase-requests.confirm.own",
  "seller.purchase-requests.confirm.all",
  "seller.inventory.read",
  "seller.inventory.create",
  "seller.inventory.update",
  "seller.inventory.restock",
  "seller.inventory.transactions.read",
  "seller.invoices.active.page",
  "seller.invoices.active.read.own",
  "seller.invoices.active.read.all",
  "seller.invoices.history.page",
  "seller.invoices.history.read.own",
  "seller.invoices.history.read.all",
  "seller.team.read",
  "seller.team.manage",
  "manager.dashboard.overview",
  "manager.credit.read",
  "manager.credit.manage",
  "manager.orders.track",
  "manager.suppliers.read",
  "manager.suppliers.manage",
  "manager.reports.read",
  "manager.support.read",
  "manager.agreements.read",
  "manager.agreements.create",
  "manager.agreements.update",
  "manager.agreements.sign",
  "manager.agreements.activate",
  "manager.agreements.suspend",
  "manager.agreements.settlements.create",
  "manager.credit-approval-requests.read",
  "manager.credit-approval-requests.approve",
  "manager.credit-approval-requests.reject",
] as const;

const featureKeys = [
  "dashboard",
  "purchase_requests",
  "invoices",
  "inventory",
  "credit",
  "agreements",
  "credit_approval_requests",
  "orders",
  "suppliers",
  "reports",
  "support",
  "team",
] as const;

const rolePermissionKeys: Record<string, readonly string[]> = {
  admin: ["*"],
  manager: [
    "manager.dashboard.overview",
    "manager.credit.read",
    "manager.credit.manage",
    "manager.orders.track",
    "manager.suppliers.read",
    "manager.suppliers.manage",
    "manager.reports.read",
    "manager.support.read",
    "manager.agreements.read",
    "manager.agreements.create",
    "manager.agreements.update",
    "manager.agreements.sign",
    "manager.agreements.activate",
    "manager.agreements.suspend",
    "manager.agreements.settlements.create",
    "manager.credit-approval-requests.read",
    "manager.credit-approval-requests.approve",
    "manager.credit-approval-requests.reject",
  ],
  seller: [
    "seller.dashboard.overview",
    "seller.purchase-requests.page",
    "seller.purchase-requests.read.own",
    "seller.purchase-requests.create",
    "seller.purchase-requests.cancel.own",
    "seller.purchase-requests.confirm.own",
    "seller.inventory.read",
    "seller.invoices.active.page",
    "seller.invoices.active.read.own",
    "seller.invoices.history.page",
    "seller.invoices.history.read.own",
  ],
  seller_manager: [
    "seller.dashboard.overview",
    "seller.purchase-requests.page",
    "seller.purchase-requests.read.own",
    "seller.purchase-requests.read.all",
    "seller.purchase-requests.create",
    "seller.purchase-requests.cancel.own",
    "seller.purchase-requests.cancel.all",
    "seller.purchase-requests.confirm.own",
    "seller.purchase-requests.confirm.all",
    "seller.inventory.read",
    "seller.inventory.create",
    "seller.inventory.update",
    "seller.inventory.restock",
    "seller.inventory.transactions.read",
    "seller.invoices.active.page",
    "seller.invoices.active.read.own",
    "seller.invoices.active.read.all",
    "seller.invoices.history.page",
    "seller.invoices.history.read.own",
    "seller.invoices.history.read.all",
    "seller.team.read",
    "seller.team.manage",
  ],
  collector: [],
};

const featurePermissionKeys: Record<string, readonly string[]> = {
  dashboard: ["*", "seller.dashboard.overview", "manager.dashboard.overview"],
  purchase_requests: [
    "seller.purchase-requests.page",
    "seller.purchase-requests.read.own",
    "seller.purchase-requests.read.all",
    "seller.purchase-requests.create",
    "seller.purchase-requests.cancel.own",
    "seller.purchase-requests.cancel.all",
    "seller.purchase-requests.confirm.own",
    "seller.purchase-requests.confirm.all",
  ],
  invoices: [
    "seller.invoices.active.page",
    "seller.invoices.active.read.own",
    "seller.invoices.active.read.all",
    "seller.invoices.history.page",
    "seller.invoices.history.read.own",
    "seller.invoices.history.read.all",
  ],
  inventory: [
    "seller.inventory.read",
    "seller.inventory.create",
    "seller.inventory.update",
    "seller.inventory.restock",
    "seller.inventory.transactions.read",
  ],
  credit: ["manager.credit.read", "manager.credit.manage"],
  agreements: [
    "manager.agreements.read",
    "manager.agreements.create",
    "manager.agreements.update",
    "manager.agreements.sign",
    "manager.agreements.activate",
    "manager.agreements.suspend",
    "manager.agreements.settlements.create",
  ],
  credit_approval_requests: [
    "manager.credit-approval-requests.read",
    "manager.credit-approval-requests.approve",
    "manager.credit-approval-requests.reject",
  ],
  orders: ["manager.orders.track"],
  suppliers: ["manager.suppliers.read", "manager.suppliers.manage"],
  reports: ["manager.reports.read"],
  support: ["manager.support.read"],
  team: ["seller.team.read", "seller.team.manage"],
};

const packageFeatureKeys: Record<string, readonly string[]> = {
  starter: ["dashboard", "purchase_requests", "invoices", "inventory"],
  pro: featureKeys,
};

const roleDescriptions: Record<string, string> = {
  admin: "مدیر کل سیستم",
  manager: "مدیر کسب و کار",
  seller: "فروشنده",
  seller_manager: "مدیر فروشنده",
  collector: "جمع آورنده محصول",
};

const permissionDescriptions: Record<string, string> = {
  "*": "دسترسی کامل سیستم",
  "seller.dashboard.overview": "مشاهده داشبورد فروشنده",
  "seller.purchase-requests.page": "مشاهده صفحه درخواست های خرید فروشنده",
  "seller.purchase-requests.read.own": "مشاهده درخواست های خرید خود فروشنده",
  "seller.purchase-requests.read.all":
    "مشاهده همه درخواست های خرید کسب و کار فروشنده",
  "seller.purchase-requests.create": "ایجاد درخواست خرید فروشنده",
  "seller.purchase-requests.cancel.own": "لغو درخواست خرید خود فروشنده",
  "seller.purchase-requests.cancel.all":
    "لغو همه درخواست های خرید کسب و کار فروشنده",
  "seller.purchase-requests.confirm.own": "تایید درخواست خرید خود فروشنده",
  "seller.purchase-requests.confirm.all":
    "تایید همه درخواست های خرید کسب و کار فروشنده",
  "seller.inventory.read": "مشاهده موجودی فروشنده",
  "seller.inventory.create": "ایجاد موجودی فروشنده",
  "seller.inventory.update": "ویرایش موجودی فروشنده",
  "seller.inventory.restock": "افزایش موجودی فروشنده",
  "seller.inventory.transactions.read": "مشاهده گردش موجودی فروشنده",
  "seller.invoices.active.page": "مشاهده صفحه فاکتورهای فعال فروشنده",
  "seller.invoices.active.read.own": "مشاهده فاکتورهای فعال خود فروشنده",
  "seller.invoices.active.read.all":
    "مشاهده همه فاکتورهای فعال کسب و کار فروشنده",
  "seller.invoices.history.page": "مشاهده صفحه تاریخچه فاکتورهای فروشنده",
  "seller.invoices.history.read.own": "مشاهده تاریخچه فاکتورهای خود فروشنده",
  "seller.invoices.history.read.all":
    "مشاهده همه تاریخچه فاکتورهای کسب و کار فروشنده",
  "seller.team.read": "مشاهده تیم فروشنده",
  "seller.team.manage": "مدیریت تیم فروشنده",
  "manager.dashboard.overview": "مشاهده داشبورد مدیر",
  "manager.credit.read": "مشاهده اعتبار",
  "manager.credit.manage": "مدیریت اعتبار",
  "manager.orders.track": "پیگیری سفارش ها",
  "manager.suppliers.read": "مشاهده تامین کنندگان",
  "manager.suppliers.manage": "مدیریت تامین کنندگان",
  "manager.reports.read": "مشاهده گزارش ها",
  "manager.support.read": "دسترسی به پشتیبانی",
  "manager.agreements.read": "مشاهده قراردادهای اعتباری",
  "manager.agreements.create": "ایجاد قرارداد اعتباری",
  "manager.agreements.update": "ویرایش قرارداد اعتباری",
  "manager.agreements.sign": "امضای قرارداد اعتباری",
  "manager.agreements.activate": "فعال سازی قرارداد اعتباری",
  "manager.agreements.suspend": "تعلیق قرارداد اعتباری",
  "manager.agreements.settlements.create": "ایجاد تسویه قرارداد اعتباری",
  "manager.credit-approval-requests.read": "مشاهده درخواست های تایید اعتبار",
  "manager.credit-approval-requests.approve": "تایید درخواست اعتبار",
  "manager.credit-approval-requests.reject": "رد درخواست اعتبار",
};

const featureNames: Record<string, string> = {
  dashboard: "داشبورد",
  purchase_requests: "درخواست های خرید",
  invoices: "فاکتورها",
  inventory: "موجودی",
  credit: "اعتبار",
  agreements: "قراردادهای اعتباری",
  credit_approval_requests: "درخواست های تایید اعتبار",
  orders: "سفارش ها",
  suppliers: "تامین کنندگان",
  reports: "گزارش ها",
  support: "پشتیبانی",
  team: "تیم",
};

const packageNames: Record<string, string> = {
  starter: "بسته شروع",
  pro: "بسته حرفه ای",
};

type SeedUser = {
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin?: boolean;
};

const seedUsers: readonly SeedUser[] = [
  {
    phone: "+989120000000",
    email: "admin@example.com",
    firstName: "ادمین",
    lastName: "سلینو",
    isAdmin: true,
  },
  {
    phone: "+989120000001",
    email: "modir@example.com",
    firstName: "علی",
    lastName: "احمدی",
  },
  {
    phone: "+989120000002",
    email: "seller@example.com",
    firstName: "سارا",
    lastName: "رضایی",
  },
  {
    phone: "+989120000004",
    email: "seller-manager@example.com",
    firstName: "نیلوفر",
    lastName: "محمدی",
  },
  {
    phone: "+989120000003",
    email: "collector@example.com",
    firstName: "مهدی",
    lastName: "کریمی",
  },
] as const;

const seedBusinessAccount = {
  name: "فروشگاه آزمایشی سلینو",
  slug: "selino-demo-business",
  type: "store" as const,
  description: "حساب کسب و کار آزمایشی برای تست پنل فارسی",
};

const seedSupplierBusinessAccount = {
  name: "تامین کننده آزمایشی سلینو",
  slug: "selino-demo-supplier",
  type: "company" as const,
  description: "حساب تامین کننده آزمایشی برای موجود کردن محصولات نمونه",
};

const seedMemberships = [
  { phone: "+989120000000", role: "admin" },
  { phone: "+989120000001", role: "manager" },
  { phone: "+989120000002", role: "seller" },
  { phone: "+989120000004", role: "seller_manager" },
  { phone: "+989120000003", role: "collector" },
] as const;

type CatalogBrandSeed = Pick<NewBrand, "name" | "slug"> & { id: number };
type CatalogCategorySeed = Pick<
  NewCategory,
  | "parentId"
  | "name"
  | "slug"
  | "description"
  | "icon"
  | "position"
  | "isActive"
  | "specSchema"
> & { id: number; parentId: number | null };
type CatalogProductSeed = Pick<
  NewProduct,
  | "specs"
  | "attributes"
  | "warrantyMonths"
  | "releaseDate"
  | "weightGrams"
  | "dimensions"
  | "isActive"
  | "defaultImageFileId"
> & {
  id: number;
  categoryId: number;
  brandId: number | null;
  title?: string;
  name?: string;
  model?: string | null;
  slug?: string;
  description?: string | null;
  searchText?: string | null;
  status?: string;
};

type ProductSampleSeed = {
  tables: {
    brands: CatalogBrandSeed[];
    categories: CatalogCategorySeed[];
    products: CatalogProductSeed[];
  };
};

const productSamplePath = join(process.cwd(), "product-sample.json");

function loadProductSample(): ProductSampleSeed | null {
  if (!existsSync(productSamplePath)) {
    console.log("product-sample.json not found; skipping catalog seed.");
    return null;
  }

  return JSON.parse(
    readFileSync(productSamplePath, "utf8"),
  ) as ProductSampleSeed;
}

async function upsertRole(db: SeedDb, name: string) {
  const existing = await db.query.roles.findFirst({
    where: (table) => eq(table.name, name),
  });

  if (existing) {
    await db
      .update(roles)
      .set({ description: roleDescriptions[name] ?? existing.description })
      .where(eq(roles.id, existing.id));
    return existing;
  }

  const [created] = await db
    .insert(roles)
    .values({ name, description: roleDescriptions[name] ?? `${name} role` })
    .returning();

  return created;
}

async function upsertPermission(db: SeedDb, name: string) {
  const existing = await db.query.permissions.findFirst({
    where: (table) => eq(table.name, name),
  });

  if (existing) {
    await db
      .update(permissions)
      .set({
        description: permissionDescriptions[name] ?? existing.description,
      })
      .where(eq(permissions.id, existing.id));
    return existing;
  }

  const [created] = await db
    .insert(permissions)
    .values({
      name,
      description: permissionDescriptions[name] ?? `${name} permission`,
    })
    .returning();

  return created;
}

async function upsertFeature(db: SeedDb, key: string) {
  const existing = await db.query.features.findFirst({
    where: (table) => eq(table.key, key),
  });

  if (existing) {
    await db
      .update(features)
      .set({
        name: featureNames[key] ?? existing.name,
        description: featureNames[key] ?? existing.description,
      })
      .where(eq(features.id, existing.id));
    return existing;
  }

  const [created] = await db
    .insert(features)
    .values({
      key,
      name: featureNames[key] ?? key,
      description: featureNames[key] ?? null,
    })
    .returning();

  return created;
}

async function upsertPackage(db: SeedDb, key: string) {
  const existing = await db.query.packages.findFirst({
    where: (table) => eq(table.key, key),
  });

  if (existing) {
    await db
      .update(packages)
      .set({
        name: packageNames[key] ?? existing.name,
        description: packageNames[key] ?? existing.description,
        isActive: true,
      })
      .where(eq(packages.id, existing.id));
    return existing;
  }

  const [created] = await db
    .insert(packages)
    .values({
      key,
      name: packageNames[key] ?? key,
      description: packageNames[key] ?? null,
      isActive: true,
    })
    .returning();

  return created;
}

async function upsertUser(db: SeedDb, data: SeedUser): Promise<User> {
  const existing = await db.query.users.findFirst({
    where: (table) => eq(table.phone, data.phone),
  });

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        isAdmin: data.isAdmin ?? false,
        isPhoneVerified: true,
        isEmailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      phone: data.phone,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      isAdmin: data.isAdmin ?? false,
      isPhoneVerified: true,
      isEmailVerified: true,
    })
    .returning();

  return created;
}

async function upsertBusinessAccount(db: SeedDb): Promise<BusinessAccount> {
  return upsertBusinessAccountData(db, seedBusinessAccount);
}

async function upsertSupplierBusinessAccount(
  db: SeedDb,
): Promise<BusinessAccount> {
  return upsertBusinessAccountData(db, seedSupplierBusinessAccount);
}

async function upsertBusinessAccountData(
  db: SeedDb,
  data: typeof seedBusinessAccount | typeof seedSupplierBusinessAccount,
): Promise<BusinessAccount> {
  const existing = await db.query.businessAccounts.findFirst({
    where: (table) => eq(table.slug, data.slug),
  });

  if (existing) {
    const [updated] = await db
      .update(businessAccounts)
      .set({
        name: data.name,
        type: data.type,
        description: data.description,
        updatedAt: new Date(),
      })
      .where(eq(businessAccounts.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db.insert(businessAccounts).values(data).returning();

  return created;
}

async function ensureBusinessMembership(
  db: SeedDb,
  businessAccount: BusinessAccount,
  user: User,
  role: Role,
) {
  const existing = await db.query.businessMembers.findFirst({
    where: (table) =>
      and(
        eq(table.businessAccountId, businessAccount.id),
        eq(table.userId, user.id),
      ),
  });

  if (existing) {
    await db
      .update(businessMembers)
      .set({ roleId: role.id, isActive: true })
      .where(eq(businessMembers.id, existing.id));
    return;
  }

  await db.insert(businessMembers).values({
    businessAccountId: businessAccount.id,
    userId: user.id,
    roleId: role.id,
    isActive: true,
  });
}

async function ensureActiveSubscription(
  db: SeedDb,
  businessAccount: BusinessAccount,
  packageRecord: Package,
) {
  const existing = await db.query.businessSubscriptions.findFirst({
    where: (table) =>
      and(
        eq(table.businessAccountId, businessAccount.id),
        eq(table.packageId, packageRecord.id),
      ),
  });

  if (existing) {
    await db
      .update(businessSubscriptions)
      .set({ isActive: true, expiresAt: null })
      .where(eq(businessSubscriptions.id, existing.id));
    return;
  }

  await db.insert(businessSubscriptions).values({
    businessAccountId: businessAccount.id,
    packageId: packageRecord.id,
    isActive: true,
  });
}

async function ensureRolePermission(
  db: SeedDb,
  role: Role,
  permission: Permission,
) {
  const existing = await db.query.rolePermissions.findFirst({
    where: (table) =>
      and(eq(table.roleId, role.id), eq(table.permissionId, permission.id)),
  });

  if (!existing) {
    await db.insert(rolePermissions).values({
      roleId: role.id,
      permissionId: permission.id,
    });
  }
}

async function ensureFeaturePermission(
  db: SeedDb,
  feature: Feature,
  permission: Permission,
) {
  const existing = await db.query.featurePermissions.findFirst({
    where: (table) =>
      and(
        eq(table.featureId, feature.id),
        eq(table.permissionId, permission.id),
      ),
  });

  if (!existing) {
    await db.insert(featurePermissions).values({
      featureId: feature.id,
      permissionId: permission.id,
    });
  }
}

async function ensurePackageFeature(
  db: SeedDb,
  packageRecord: Package,
  feature: Feature,
) {
  const existing = await db.query.packageFeatures.findFirst({
    where: (table) =>
      and(
        eq(table.packageId, packageRecord.id),
        eq(table.featureId, feature.id),
      ),
  });

  if (!existing) {
    await db.insert(packageFeatures).values({
      packageId: packageRecord.id,
      featureId: feature.id,
    });
  }
}

async function upsertCatalogBrand(
  db: SeedDb,
  data: CatalogBrandSeed,
): Promise<Brand> {
  const existing = await db.query.brands.findFirst({
    where: (table) => eq(table.slug, data.slug),
  });

  if (existing) {
    const [updated] = await db
      .update(brands)
      .set({
        name: data.name,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db.insert(brands).values(data).returning();
  return created;
}

async function upsertCatalogCategory(
  db: SeedDb,
  data: CatalogCategorySeed,
  categoryIdBySeedId: Map<number, number>,
): Promise<Category> {
  const parentId =
    data.parentId == null
      ? null
      : (categoryIdBySeedId.get(data.parentId) ?? data.parentId);
  const values = { ...data, parentId };

  const existing = await db.query.categories.findFirst({
    where: (table) => eq(table.slug, data.slug),
  });

  if (existing) {
    const [updated] = await db
      .update(categories)
      .set({
        parentId,
        name: values.name,
        description: values.description,
        icon: values.icon,
        position: values.position,
        isActive: values.isActive,
        specSchema: values.specSchema,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db.insert(categories).values(values).returning();
  return created;
}

async function upsertCatalogProduct(
  db: SeedDb,
  data: CatalogProductSeed,
  brandIdBySeedId: Map<number, number>,
  categoryIdBySeedId: Map<number, number>,
): Promise<Product> {
  const title = data.title ?? data.name;
  if (!title) {
    throw new Error(`Product ${data.id} must include title or name`);
  }

  const categoryId = categoryIdBySeedId.get(data.categoryId);
  if (!categoryId) {
    throw new Error(
      `Category ${data.categoryId} was not seeded before product ${data.id}`,
    );
  }

  const brandId =
    data.brandId == null ? null : (brandIdBySeedId.get(data.brandId) ?? null);
  if (data.brandId != null && brandId == null) {
    throw new Error(
      `Brand ${data.brandId} was not seeded before product ${data.id}`,
    );
  }

  const attributes = {
    ...(data.description ? { description: data.description } : {}),
    ...(data.attributes ?? {}),
    ...(data.slug ? { slug: data.slug } : {}),
  };

  const values = {
    ...data,
    categoryId,
    brandId,
    title,
    model: data.model ?? data.slug ?? null,
    attributes: Object.keys(attributes).length > 0 ? attributes : null,
    searchText:
      data.searchText ??
      [title, data.slug, data.description].filter(Boolean).join(" "),
    status: data.status ?? (data.isActive === false ? "draft" : "active"),
    defaultImageFileId: data.defaultImageFileId ?? null,
  };

  const existing = await db.query.products.findFirst({
    where: (table) => eq(table.id, data.id),
  });

  if (existing) {
    const [updated] = await db
      .update(products)
      .set({
        categoryId: values.categoryId,
        brandId: values.brandId,
        title: values.title,
        model: values.model,
        specs: values.specs,
        attributes: values.attributes,
        warrantyMonths: values.warrantyMonths,
        releaseDate: values.releaseDate,
        weightGrams: values.weightGrams,
        dimensions: values.dimensions,
        searchText: values.searchText,
        status: values.status,
        isActive: values.isActive,
        defaultImageFileId: values.defaultImageFileId,
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db.insert(products).values(values).returning();
  return created;
}

function getDemoInventoryValues(productId: number, index: number) {
  return {
    price: 10_000_000 + index * 750_000 + (productId % 10) * 125_000,
    stock: 5 + (index % 8),
    reservedStock: 0,
    minOrderQty: 1,
    maxOrderQty: 5 + (index % 4),
    isActive: true,
    visible: true,
  };
}

async function upsertDemoInventory(
  db: SeedDb,
  supplierBusinessAccountId: number,
  product: Product,
  index: number,
) {
  const values = getDemoInventoryValues(product.id, index);
  const existing = await db.query.storeInventories.findFirst({
    where: (table) =>
      and(
        eq(table.businessAccountId, supplierBusinessAccountId),
        eq(table.productId, product.id),
      ),
  });

  if (existing) {
    await db
      .update(storeInventories)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(storeInventories.id, existing.id));
    return;
  }

  await db.insert(storeInventories).values({
    businessAccountId: supplierBusinessAccountId,
    productId: product.id,
    ...values,
  });
}

async function resetSerialSequence(
  db: SeedDb,
  tableName: string,
  idColumnName = "id",
) {
  await db.execute(
    sql`select setval(pg_get_serial_sequence(${tableName}, ${idColumnName}), coalesce((select max(id) from ${sql.identifier(tableName)}), 1), true)`,
  );
}

async function seedCatalogFromProductSample(
  db: SeedDb,
  supplierBusinessAccount: BusinessAccount,
) {
  const sample = loadProductSample();
  if (!sample) {
    return;
  }

  const brandIdBySeedId = new Map<number, number>();
  const categoryIdBySeedId = new Map<number, number>();

  for (const brandSeed of sample.tables.brands) {
    const brand = await upsertCatalogBrand(db, brandSeed);
    brandIdBySeedId.set(brandSeed.id, brand.id);
  }

  for (const categorySeed of sample.tables.categories) {
    const category = await upsertCatalogCategory(
      db,
      categorySeed,
      categoryIdBySeedId,
    );
    categoryIdBySeedId.set(categorySeed.id, category.id);
  }

  const productRecords: Product[] = [];
  for (const [index, productSeed] of sample.tables.products.entries()) {
    const product = await upsertCatalogProduct(
      db,
      productSeed,
      brandIdBySeedId,
      categoryIdBySeedId,
    );
    productRecords.push(product);
    await upsertDemoInventory(db, supplierBusinessAccount.id, product, index);
  }

  await resetSerialSequence(db, "brands");
  await resetSerialSequence(db, "categories");
  await resetSerialSequence(db, "products");

  console.log(
    `Seeded catalog sample: ${sample.tables.brands.length} brands, ${sample.tables.categories.length} categories, ${sample.tables.products.length} products, ${productRecords.length} inventory offers.`,
  );
}

async function main() {
  const connection = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(connection, { schema });

  const roleByName = new Map<string, Role>();
  const permissionByName = new Map<string, Permission>();
  const featureByKey = new Map<string, Feature>();
  const packageByKey = new Map<string, Package>();

  for (const name of Object.keys(rolePermissionKeys)) {
    roleByName.set(name, await upsertRole(db, name));
  }

  for (const key of permissionKeys) {
    permissionByName.set(key, await upsertPermission(db, key));
  }

  for (const key of featureKeys) {
    featureByKey.set(key, await upsertFeature(db, key));
  }

  for (const key of Object.keys(packageFeatureKeys)) {
    packageByKey.set(key, await upsertPackage(db, key));
  }

  for (const [roleName, rolePermissionsForRole] of Object.entries(
    rolePermissionKeys,
  )) {
    const role = roleByName.get(roleName)!;
    const allowedPermissionIds = rolePermissionsForRole.map(
      (permissionKey) => permissionByName.get(permissionKey)!.id,
    );

    if (allowedPermissionIds.length === 0) {
      await db
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, role.id));
    } else {
      await db
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, role.id),
            notInArray(rolePermissions.permissionId, allowedPermissionIds),
          ),
        );
    }

    for (const permissionKey of rolePermissionsForRole) {
      await ensureRolePermission(
        db,
        role,
        permissionByName.get(permissionKey)!,
      );
    }
  }

  for (const [featureKey, permissionsForFeature] of Object.entries(
    featurePermissionKeys,
  )) {
    const feature = featureByKey.get(featureKey)!;
    const allowedPermissionIds = permissionsForFeature.map(
      (permissionKey) => permissionByName.get(permissionKey)!.id,
    );

    if (allowedPermissionIds.length === 0) {
      await db
        .delete(featurePermissions)
        .where(eq(featurePermissions.featureId, feature.id));
    } else {
      await db
        .delete(featurePermissions)
        .where(
          and(
            eq(featurePermissions.featureId, feature.id),
            notInArray(featurePermissions.permissionId, allowedPermissionIds),
          ),
        );
    }

    for (const permissionKey of permissionsForFeature) {
      await ensureFeaturePermission(
        db,
        feature,
        permissionByName.get(permissionKey)!,
      );
    }
  }

  for (const [packageKey, featuresForPackage] of Object.entries(
    packageFeatureKeys,
  )) {
    const packageRecord = packageByKey.get(packageKey)!;
    const allowedFeatureIds = featuresForPackage.map(
      (featureKey) => featureByKey.get(featureKey)!.id,
    );

    if (allowedFeatureIds.length === 0) {
      await db
        .delete(packageFeatures)
        .where(eq(packageFeatures.packageId, packageRecord.id));
    } else {
      await db
        .delete(packageFeatures)
        .where(
          and(
            eq(packageFeatures.packageId, packageRecord.id),
            notInArray(packageFeatures.featureId, allowedFeatureIds),
          ),
        );
    }

    for (const featureKey of featuresForPackage) {
      await ensurePackageFeature(
        db,
        packageRecord,
        featureByKey.get(featureKey)!,
      );
    }
  }

  const userByPhone = new Map<string, User>();
  for (const seedUser of seedUsers) {
    userByPhone.set(seedUser.phone, await upsertUser(db, seedUser));
  }

  const businessAccount = await upsertBusinessAccount(db);
  const supplierBusinessAccount = await upsertSupplierBusinessAccount(db);
  await ensureActiveSubscription(db, businessAccount, packageByKey.get("pro")!);
  await ensureActiveSubscription(
    db,
    supplierBusinessAccount,
    packageByKey.get("pro")!,
  );

  for (const membership of seedMemberships) {
    await ensureBusinessMembership(
      db,
      businessAccount,
      userByPhone.get(membership.phone)!,
      roleByName.get(membership.role)!,
    );
  }

  await seedCatalogFromProductSample(db, supplierBusinessAccount);

  await connection.end();
}

void main();
