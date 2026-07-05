import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { TXContext } from "./database.types.js";
import {
  brands,
  categories,
  files,
  productImages,
  products,
  purchaseRequestItems,
  purchaseRequests,
  StoreMemberRole,
  storeInventories,
  storeInventoryTransactions,
  storeMembers,
  stores,
  users,
  type CategorySpecSchema,
  type NewBrand,
  type NewCategory,
  type NewFileRecord,
  type NewProduct,
  type NewPurchaseRequest,
  type NewStore,
  type NewUser,
  type StoreInventory,
} from "./schema/index.js";
import * as schema from "./schema/index.js";

config();

type SeedUser = NewUser & { phone: string };
type SeedBrand = NewBrand & { slug: string };
type SeedCategory = Omit<NewCategory, "parentId"> & {
  slug: string;
  parentSlug?: string;
};
type SeedStore = NewStore & { slug: string; ownerPhone: string };
type SeedProduct = Omit<NewProduct, "categoryId" | "brandId"> & {
  categorySlug: string;
  brandSlug: string;
  imagePath: string;
};

const seedUsers: SeedUser[] = [
  {
    phone: "09120000001",
    email: "ali.rezaei@example.com",
    firstName: "علی",
    lastName: "رضایی",
    isAdmin: true,
    isPhoneVerified: true,
    isEmailVerified: true,
  },
  {
    phone: "09120000002",
    email: "sara.mohammadi@example.com",
    firstName: "سارا",
    lastName: "محمدی",
    isPhoneVerified: true,
    isEmailVerified: true,
  },
  {
    phone: "09120000003",
    email: "mahdi.karimi@example.com",
    firstName: "مهدی",
    lastName: "کریمی",
    isPhoneVerified: true,
  },
  {
    phone: "09120000004",
    email: "narges.ahmadi@example.com",
    firstName: "نرگس",
    lastName: "احمدی",
    isPhoneVerified: true,
  },
];

const seedBrands: SeedBrand[] = [
  { name: "دیجی‌کالا", slug: "digikala" },
  { name: "اسنوا", slug: "snowa" },
  { name: "پارس‌خزر", slug: "pars-khazar" },
  { name: "جی‌پلاس", slug: "gplus" },
  { name: "امرسان", slug: "emerson" },
];

const mobileSpecs: CategorySpecSchema = {
  color: {
    type: "enum",
    required: true,
    label: "رنگ",
    options: ["مشکی", "سفید", "آبی", "سبز"],
  },
  storage: { type: "number", required: true, label: "حافظه داخلی", unit: "GB" },
  ram: { type: "number", required: true, label: "رم", unit: "GB" },
};

const homeApplianceSpecs: CategorySpecSchema = {
  energyRank: {
    type: "enum",
    required: true,
    label: "رده مصرف انرژی",
    options: ["A", "B", "C"],
  },
  capacity: { type: "number", required: false, label: "ظرفیت", unit: "لیتر" },
};

const seedCategories: SeedCategory[] = [
  {
    name: "کالای دیجیتال",
    slug: "digital-goods",
    description: "محصولات دیجیتال و تجهیزات هوشمند",
    icon: "smartphone",
    position: 1,
    specSchema: {},
  },
  {
    name: "موبایل",
    slug: "mobile",
    parentSlug: "digital-goods",
    description: "گوشی موبایل و لوازم مرتبط",
    icon: "mobile",
    position: 2,
    specSchema: mobileSpecs,
  },
  {
    name: "لوازم خانگی",
    slug: "home-appliances",
    description: "لوازم کاربردی آشپزخانه و خانه",
    icon: "home",
    position: 3,
    specSchema: homeApplianceSpecs,
  },
  {
    name: "آشپزخانه",
    slug: "kitchen",
    parentSlug: "home-appliances",
    description: "وسایل کوچک و بزرگ آشپزخانه",
    icon: "utensils",
    position: 4,
    specSchema: homeApplianceSpecs,
  },
];

const seedStores: SeedStore[] = [
  {
    name: "فروشگاه مرکزی سلینو",
    slug: "selino-central",
    description: "تامین‌کننده کالای دیجیتال و لوازم خانگی در تهران",
    ownerPhone: "09120000001",
  },
  {
    name: "بازار موبایل شیراز",
    slug: "shiraz-mobile-market",
    description: "فروش تخصصی گوشی و لوازم جانبی",
    ownerPhone: "09120000002",
  },
];

const seedProducts: SeedProduct[] = [
  {
    categorySlug: "mobile",
    brandSlug: "digikala",
    title: "گوشی موبایل آریا مدل A12",
    model: "A12-128",
    specs: { color: "مشکی", storage: 128, ram: 8 },
    attributes: { گارانتی: "۱۸ ماهه", رجیستری: "دارد" },
    warrantyMonths: 18,
    releaseDate: "2025-03-15",
    weightGrams: 189,
    dimensions: "8.2 × 75.8 × 162.3 میلی‌متر",
    searchText: "گوشی موبایل آریا A12 حافظه ۱۲۸ رم ۸",
    status: "published",
    isActive: true,
    imagePath: "seed/products/aria-a12.jpg",
  },
  {
    categorySlug: "mobile",
    brandSlug: "gplus",
    title: "گوشی موبایل جی‌پلاس مدل شاهین",
    model: "GP-SHAHIN-256",
    specs: { color: "آبی", storage: 256, ram: 12 },
    attributes: { گارانتی: "۲۴ ماهه", رجیستری: "دارد" },
    warrantyMonths: 24,
    releaseDate: "2025-08-20",
    weightGrams: 202,
    dimensions: "8.6 × 77.1 × 164.5 میلی‌متر",
    searchText: "گوشی موبایل جی پلاس شاهین حافظه ۲۵۶ رم ۱۲",
    status: "published",
    isActive: true,
    imagePath: "seed/products/gplus-shahin.jpg",
  },
  {
    categorySlug: "kitchen",
    brandSlug: "pars-khazar",
    title: "پلوپز پارس‌خزر مدل خانواده",
    model: "RC-181TYAN",
    specs: { energyRank: "A", capacity: 5 },
    attributes: { جنس_بدنه: "فلزی", قابلیت: "ته‌دیگ ساز" },
    warrantyMonths: 24,
    releaseDate: "2024-11-10",
    weightGrams: 4200,
    dimensions: "۳۴ × ۳۴ × ۲۸ سانتی‌متر",
    searchText: "پلوپز پارس خزر خانواده ته دیگ ساز",
    status: "published",
    isActive: true,
    imagePath: "seed/products/pars-khazar-rice-cooker.jpg",
  },
  {
    categorySlug: "home-appliances",
    brandSlug: "snowa",
    title: "یخچال فریزر اسنوا مدل سپید",
    model: "SN8-3320",
    specs: { energyRank: "A", capacity: 320 },
    attributes: { سیستم_سرمایش: "نوفراست", رنگ: "سفید" },
    warrantyMonths: 30,
    releaseDate: "2025-01-05",
    weightGrams: 72000,
    dimensions: "۶۸ × ۷۰ × ۱۸۰ سانتی‌متر",
    searchText: "یخچال فریزر اسنوا سپید نوفراست",
    status: "published",
    isActive: true,
    imagePath: "seed/products/snowa-fridge-sepid.jpg",
  },
];

async function upsertUser(tx: TXContext, data: SeedUser) {
  const existing = await tx.query.users.findFirst({
    where: (table) => eq(table.phone, data.phone),
  });

  if (existing) {
    const [updated] = await tx
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await tx.insert(users).values(data).returning();
  return created;
}

async function upsertBrand(tx: TXContext, data: SeedBrand) {
  const existing = await tx.query.brands.findFirst({
    where: (table) => eq(table.slug, data.slug),
  });

  if (existing) {
    const [updated] = await tx
      .update(brands)
      .set({ name: data.name, updatedAt: new Date() })
      .where(eq(brands.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await tx.insert(brands).values(data).returning();
  return created;
}

async function upsertCategory(
  tx: TXContext,
  data: SeedCategory,
  parentId: number | null,
) {
  const existing = await tx.query.categories.findFirst({
    where: (table) => eq(table.slug, data.slug),
  });
  const values: NewCategory = { ...data, parentId };
  delete (values as Partial<SeedCategory>).parentSlug;

  if (existing) {
    const [updated] = await tx
      .update(categories)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(categories.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await tx.insert(categories).values(values).returning();
  return created;
}

async function upsertStore(tx: TXContext, data: SeedStore, ownerId: number) {
  const existing = await tx.query.stores.findFirst({
    where: (table) => eq(table.slug, data.slug),
  });
  const values: NewStore = {
    name: data.name,
    slug: data.slug,
    description: data.description,
    ownerId,
  };

  if (existing) {
    const [updated] = await tx
      .update(stores)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(stores.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await tx.insert(stores).values(values).returning();
  return created;
}

async function ensureStoreMember(
  tx: TXContext,
  storeId: number,
  userId: number,
  role: StoreMemberRole,
) {
  const existing = await tx.query.storeMembers.findFirst({
    where: (table) => and(eq(table.storeId, storeId), eq(table.userId, userId)),
  });

  if (existing) {
    await tx
      .update(storeMembers)
      .set({ role, isActive: true })
      .where(eq(storeMembers.id, existing.id));
    return;
  }

  await tx.insert(storeMembers).values({ storeId, userId, role });
}

async function ensureFile(
  tx: TXContext,
  data: NewFileRecord & { path: string },
) {
  const existing = await tx.query.files.findFirst({
    where: (table) => eq(table.path, data.path),
  });

  if (existing) return existing;

  const [created] = await tx.insert(files).values(data).returning();
  return created;
}

async function upsertProduct(
  tx: TXContext,
  data: SeedProduct,
  categoryId: number,
  brandId: number,
  defaultImageFileId: number,
) {
  const existing = await tx.query.products.findFirst({
    where: (table) =>
      and(eq(table.title, data.title), eq(table.model, data.model ?? "")),
  });
  const values: NewProduct = {
    title: data.title,
    model: data.model,
    categoryId,
    brandId,
    specs: data.specs,
    attributes: data.attributes,
    warrantyMonths: data.warrantyMonths,
    releaseDate: data.releaseDate,
    weightGrams: data.weightGrams,
    dimensions: data.dimensions,
    searchText: data.searchText,
    status: data.status,
    isActive: data.isActive,
    defaultImageFileId,
  };

  if (existing) {
    const [updated] = await tx
      .update(products)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(products.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await tx.insert(products).values(values).returning();
  return created;
}

async function ensureProductImage(
  tx: TXContext,
  productId: number,
  fileId: number,
  alt: string,
) {
  const existing = await tx.query.productImages.findFirst({
    where: (table) =>
      and(eq(table.productId, productId), eq(table.fileId, fileId)),
  });

  if (existing) return;

  await tx
    .insert(productImages)
    .values({ productId, fileId, position: 0, alt });
}

async function upsertInventory(
  tx: TXContext,
  storeId: number,
  productId: number,
  createdBy: number,
  price: number,
  stock: number,
) {
  const existing = await tx.query.storeInventories.findFirst({
    where: (table) =>
      and(eq(table.storeId, storeId), eq(table.productId, productId)),
  });

  if (existing) {
    const [updated] = await tx
      .update(storeInventories)
      .set({
        price,
        stock,
        reservedStock: 0,
        minOrderQty: 1,
        maxOrderQty: 5,
        isActive: true,
        visible: true,
        createdBy,
        updatedAt: new Date(),
      })
      .where(eq(storeInventories.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await tx
    .insert(storeInventories)
    .values({
      storeId,
      productId,
      price,
      stock,
      minOrderQty: 1,
      maxOrderQty: 5,
      createdBy,
    })
    .returning();
  return created;
}

async function ensureInventoryTransaction(
  tx: TXContext,
  storeInventoryId: number,
  changedBy: number,
  change: number,
  reference: string,
) {
  const existing = await tx.query.storeInventoryTransactions.findFirst({
    where: (table) => eq(table.reference, reference),
  });

  if (existing) return;

  await tx.insert(storeInventoryTransactions).values({
    storeInventoryId,
    changedBy,
    change,
    reason: "restock",
    reference,
  });
}

async function ensurePurchaseRequest(
  tx: TXContext,
  data: NewPurchaseRequest & { code: string },
  items: Array<{
    productId: number;
    storeInventoryId: number;
    qty: number;
    price: number;
  }>,
) {
  const existing = await tx.query.purchaseRequests.findFirst({
    where: (table) => eq(table.code, data.code),
  });

  if (existing) return existing;

  const totalAmount = items.reduce(
    (sum, item) => sum + item.qty * item.price,
    0,
  );
  const [created] = await tx
    .insert(purchaseRequests)
    .values({ ...data, totalAmount })
    .returning();

  await tx.insert(purchaseRequestItems).values(
    items.map((item) => ({
      purchaseRequestId: created.id,
      productId: item.productId,
      storeInventoryId: item.storeInventoryId,
      qty: item.qty,
      price: item.price,
      total: item.qty * item.price,
    })),
  );

  return created;
}

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    await db.transaction(async (tx) => {
      const userByPhone = new Map<
        string,
        Awaited<ReturnType<typeof upsertUser>>
      >();
      for (const user of seedUsers) {
        const saved = await upsertUser(tx, user);
        userByPhone.set(user.phone, saved);
      }

      const brandBySlug = new Map<
        string,
        Awaited<ReturnType<typeof upsertBrand>>
      >();
      for (const brand of seedBrands) {
        const saved = await upsertBrand(tx, brand);
        brandBySlug.set(brand.slug, saved);
      }

      const categoryBySlug = new Map<
        string,
        Awaited<ReturnType<typeof upsertCategory>>
      >();
      for (const category of seedCategories) {
        const parentId = category.parentSlug
          ? (categoryBySlug.get(category.parentSlug)?.id ?? null)
          : null;
        const saved = await upsertCategory(tx, category, parentId);
        categoryBySlug.set(category.slug, saved);
      }

      const storeBySlug = new Map<
        string,
        Awaited<ReturnType<typeof upsertStore>>
      >();
      for (const store of seedStores) {
        const owner = userByPhone.get(store.ownerPhone);
        if (!owner)
          throw new Error(`Seed owner not found: ${store.ownerPhone}`);

        const saved = await upsertStore(tx, store, owner.id);
        storeBySlug.set(store.slug, saved);
        await ensureStoreMember(tx, saved.id, owner.id, StoreMemberRole.Owner);
      }

      const manager = userByPhone.get("09120000003");
      const seller = userByPhone.get("09120000004");
      const centralStore = storeBySlug.get("selino-central");
      if (centralStore && manager) {
        await ensureStoreMember(
          tx,
          centralStore.id,
          manager.id,
          StoreMemberRole.Manager,
        );
      }
      if (centralStore && seller) {
        await ensureStoreMember(
          tx,
          centralStore.id,
          seller.id,
          StoreMemberRole.Seller,
        );
      }

      const productRecords: Array<Awaited<ReturnType<typeof upsertProduct>>> =
        [];
      for (const product of seedProducts) {
        const category = categoryBySlug.get(product.categorySlug);
        const brand = brandBySlug.get(product.brandSlug);
        if (!category)
          throw new Error(`Seed category not found: ${product.categorySlug}`);
        if (!brand)
          throw new Error(`Seed brand not found: ${product.brandSlug}`);

        const image = await ensureFile(tx, {
          bucketName: "product-media",
          path: product.imagePath,
          filename: product.imagePath.split("/").at(-1) ?? "product.jpg",
          mimetype: "image/jpeg",
          sizeInBytes: 256_000,
          isPublic: true,
          status: "ready",
          uploadedBy: userByPhone.get("09120000001")?.id,
        });
        const saved = await upsertProduct(
          tx,
          product,
          category.id,
          brand.id,
          image.id,
        );
        await ensureProductImage(tx, saved.id, image.id, product.title);
        productRecords.push(saved);
      }

      if (!centralStore) throw new Error("Central seed store was not created");
      const owner = userByPhone.get("09120000001");
      if (!owner) throw new Error("Central seed owner was not created");

      const inventoryRecords: StoreInventory[] = [];
      for (const [index, product] of productRecords.entries()) {
        const inventory = await upsertInventory(
          tx,
          centralStore.id,
          product.id,
          owner.id,
          [48_500_000, 62_900_000, 4_250_000, 38_700_000][index] ?? 1_000_000,
          [18, 12, 25, 7][index] ?? 10,
        );
        await ensureInventoryTransaction(
          tx,
          inventory.id,
          owner.id,
          inventory.stock,
          `seed-restock-${inventory.id}`,
        );
        inventoryRecords.push(inventory);
      }

      const requester = userByPhone.get("09120000002");
      if (requester && inventoryRecords[0] && inventoryRecords[2]) {
        await ensurePurchaseRequest(
          tx,
          {
            requesterId: requester.id,
            storeId: centralStore.id,
            code: "SEED-PR-1001",
            status: "new",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            notes: "درخواست آزمایشی برای بررسی فرایند خرید",
          },
          [
            {
              productId: inventoryRecords[0].productId,
              storeInventoryId: inventoryRecords[0].id,
              qty: 1,
              price: inventoryRecords[0].price,
            },
            {
              productId: inventoryRecords[2].productId,
              storeInventoryId: inventoryRecords[2].id,
              qty: 2,
              price: inventoryRecords[2].price,
            },
          ],
        );
      }
    });

    console.log("Persian dummy data seeded successfully.");
  } finally {
    await client.end();
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
