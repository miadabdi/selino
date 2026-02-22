import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  productImages,
  products,
  type NewProduct,
  type NewProductImage,
} from "../database/schema/index";
import type { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  list(whereClauses: SQL<unknown>[], txContext: TXContext = this.db) {
    return txContext.query.products.findMany({
      where: and(...whereClauses),
      orderBy: (table) => [asc(table.id)],
    });
  }

  async createProduct(data: NewProduct, txContext: TXContext = this.db) {
    const [created] = await txContext.insert(products).values(data).returning();
    return created;
  }

  async findActiveByIdWithImages(id: number, txContext: TXContext = this.db) {
    return txContext.query.products.findFirst({
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
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    return updated;
  }

  async softDeleteById(id: number, txContext: TXContext = this.db) {
    await txContext
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(products.id, id));
  }

  async createProductImage(
    data: NewProductImage,
    txContext: TXContext = this.db,
  ) {
    const [image] = await txContext
      .insert(productImages)
      .values(data)
      .returning();
    return image;
  }

  async getMaxImagePosition(productId: number, txContext: TXContext = this.db) {
    const [maxPositionRow] = await txContext
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
    txContext: TXContext = this.db,
  ) {
    await txContext
      .update(products)
      .set({ defaultImageFileId: fileId, updatedAt: new Date() })
      .where(eq(products.id, productId));
  }

  async listImageIds(productId: number, txContext: TXContext = this.db) {
    return txContext.query.productImages.findMany({
      columns: { id: true },
      where: (table) => eq(table.productId, productId),
    });
  }

  async updateImagePosition(
    productId: number,
    imageId: number,
    position: number,
    txContext: TXContext = this.db,
  ) {
    await txContext
      .update(productImages)
      .set({ position })
      .where(
        and(
          eq(productImages.id, imageId),
          eq(productImages.productId, productId),
        ),
      );
  }

  async listImagesByProductId(
    productId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.productImages.findMany({
      where: (table) => eq(table.productId, productId),
      orderBy: (table) => [asc(table.position), asc(table.id)],
    });
  }
}
