import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database, DBContext } from "../database/database.types.js";
import {
  productImages,
  products,
  type NewProduct,
  type NewProductImage,
} from "../database/schema/index.js";
import type { UpdateProductDto } from "./dto/update-product.dto.js";

@Injectable()
export class ProductsRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  list(whereClauses: SQL<unknown>[], db: DBContext = this.db) {
    return db.query.products.findMany({
      where: and(...whereClauses),
      orderBy: (table) => [asc(table.id)],
    });
  }

  async createProduct(data: NewProduct, db: DBContext = this.db) {
    const [created] = await db.insert(products).values(data).returning();
    return created;
  }

  async findActiveByIdWithImages(id: number, db: DBContext = this.db) {
    return db.query.products.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
      with: {
        images: {
          orderBy: (table) => [asc(table.position), asc(table.id)],
        },
      },
    });
  }

  async updateProductById(
    id: number,
    data: UpdateProductDto,
    db: DBContext = this.db,
  ) {
    const [updated] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    return updated;
  }

  async softDeleteById(id: number, db: DBContext = this.db) {
    await db
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(products.id, id));
  }

  async createProductImage(data: NewProductImage, db: DBContext = this.db) {
    const [image] = await db.insert(productImages).values(data).returning();
    return image;
  }

  async getMaxImagePosition(productId: number, db: DBContext = this.db) {
    const [maxPositionRow] = await db
      .select({
        max: sql<number>`coalesce(max(${productImages.position}), -1)::int`,
      })
      .from(productImages)
      .where(eq(productImages.productId, productId));

    return maxPositionRow?.max ?? -1;
  }

  async setDefaultImageFileId(
    productId: number,
    fileId: number,
    db: DBContext = this.db,
  ) {
    await db
      .update(products)
      .set({ defaultImageFileId: fileId, updatedAt: new Date() })
      .where(eq(products.id, productId));
  }

  async listImageIds(productId: number, db: DBContext = this.db) {
    return db.query.productImages.findMany({
      columns: { id: true },
      where: (table) => eq(table.productId, productId),
    });
  }

  async updateImagePosition(
    productId: number,
    imageId: number,
    position: number,
    db: DBContext = this.db,
  ) {
    await db
      .update(productImages)
      .set({ position })
      .where(
        and(
          eq(productImages.id, imageId),
          eq(productImages.productId, productId),
        ),
      );
  }

  async listImagesByProductId(productId: number, db: DBContext = this.db) {
    return db.query.productImages.findMany({
      where: (table) => eq(table.productId, productId),
      orderBy: (table) => [asc(table.position), asc(table.id)],
    });
  }
}
