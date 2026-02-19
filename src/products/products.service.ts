import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, sql, SQL } from "drizzle-orm";
import { throwHttpError } from "../common/http-error.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import {
  categories,
  productImages,
  products,
  type CategorySpecSchema,
} from "../database/schema/index.js";
import { FilesService } from "../files/files.service.js";
import { AddProductImageDto } from "./dto/add-product-image.dto.js";
import { CreateProductDto } from "./dto/create-product.dto.js";
import { ReorderProductImagesDto } from "./dto/reorder-product-images.dto.js";
import { UpdateProductDto } from "./dto/update-product.dto.js";

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly filesService: FilesService,
  ) {}

  async list(query: Record<string, unknown>) {
    const whereClauses: SQL<unknown>[] = [isNull(products.deletedAt)];

    if (query.category) {
      whereClauses.push(eq(products.categoryId, Number(query.category)));
    }

    if (query.brand) {
      whereClauses.push(eq(products.brandId, Number(query.brand)));
    }

    const specsFilters =
      query.specs && typeof query.specs === "object"
        ? (query.specs as Record<string, unknown>)
        : {};

    for (const [field, condition] of Object.entries(specsFilters)) {
      if (!condition || typeof condition !== "object") {
        continue;
      }

      const typedCondition = condition as Record<string, unknown>;

      if (typedCondition.gte != null) {
        whereClauses.push(
          sql`(${products.specs} ->> ${field})::numeric >= ${Number(typedCondition.gte)}`,
        );
      }

      if (typedCondition.lte != null) {
        whereClauses.push(
          sql`(${products.specs} ->> ${field})::numeric <= ${Number(typedCondition.lte)}`,
        );
      }

      if (typedCondition.eq != null) {
        whereClauses.push(
          sql`${products.specs} ->> ${field} = ${String(typedCondition.eq)}`,
        );
      }
    }

    return this.db
      .select()
      .from(products)
      .where(and(...whereClauses))
      .orderBy(asc(products.id));
  }

  async create(
    dto: CreateProductDto,
    userId: number,
    pictures: Express.Multer.File[] = [],
  ) {
    const category = await this.getCategory(dto.categoryId);
    this.validateSpecs(category.specSchema ?? {}, dto.specs);

    const [created] = await this.db
      .insert(products)
      .values({
        categoryId: dto.categoryId,
        brandId: dto.brandId ?? null,
        title: dto.title,
        model: dto.model ?? null,
        specs: dto.specs,
        attributes: dto.attributes ?? null,
        warrantyMonths: dto.warrantyMonths ?? null,
        releaseDate: dto.releaseDate ?? null,
        weightGrams: dto.weightGrams ?? null,
        dimensions: dto.dimensions ?? null,
        searchText: dto.searchText ?? null,
        status: dto.status ?? "draft",
        isActive: dto.isActive ?? true,
        defaultImageFileId: dto.defaultImageFileId ?? null,
      })
      .returning();

    if (pictures.length > 0) {
      const uploads = await Promise.all(
        pictures.map((picture) =>
          this.filesService.uploadFromBuffer(
            "productMedia",
            picture.buffer,
            picture.originalname,
            picture.mimetype,
            userId,
          ),
        ),
      );

      await this.db.transaction(async (tx) => {
        for (const [index, uploaded] of uploads.entries()) {
          await tx.insert(productImages).values({
            productId: created.id,
            fileId: uploaded.id,
            position: index,
          });
        }

        if (created.defaultImageFileId == null && uploads.length > 0) {
          await tx
            .update(products)
            .set({ defaultImageFileId: uploads[0].id, updatedAt: new Date() })
            .where(eq(products.id, created.id));
        }
      });
    }

    return created;
  }

  async getById(id: number) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);

    if (!product) {
      throwHttpError(HttpStatus.NOT_FOUND, "Product not found");
    }

    const images = await this.db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position), asc(productImages.id));

    return { ...product, images };
  }

  async update(
    id: number,
    dto: UpdateProductDto,
    userId: number,
    pictures: Express.Multer.File[] = [],
  ) {
    const current = await this.getById(id);
    const categoryId = dto.categoryId ?? current.categoryId;

    if (dto.specs != null) {
      const category = await this.getCategory(categoryId);
      this.validateSpecs(category.specSchema ?? {}, dto.specs);
    }

    const [updated] = await this.db
      .update(products)
      .set({
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        title: dto.title,
        model: dto.model,
        specs: dto.specs,
        attributes: dto.attributes,
        warrantyMonths: dto.warrantyMonths,
        releaseDate: dto.releaseDate,
        weightGrams: dto.weightGrams,
        dimensions: dto.dimensions,
        searchText: dto.searchText,
        status: dto.status,
        isActive: dto.isActive,
        defaultImageFileId: dto.defaultImageFileId,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (pictures.length > 0) {
      const uploads = await Promise.all(
        pictures.map((picture) =>
          this.filesService.uploadFromBuffer(
            "productMedia",
            picture.buffer,
            picture.originalname,
            picture.mimetype,
            userId,
          ),
        ),
      );

      const [maxPositionRow] = await this.db
        .select({
          max: sql<number>`coalesce(max(${productImages.position}), -1)::int`,
        })
        .from(productImages)
        .where(eq(productImages.productId, id));

      const startPosition = (maxPositionRow?.max ?? -1) + 1;

      await this.db.transaction(async (tx) => {
        for (const [index, uploaded] of uploads.entries()) {
          await tx.insert(productImages).values({
            productId: id,
            fileId: uploaded.id,
            position: startPosition + index,
          });
        }

        if (updated.defaultImageFileId == null && uploads.length > 0) {
          await tx
            .update(products)
            .set({ defaultImageFileId: uploads[0].id, updatedAt: new Date() })
            .where(eq(products.id, id));
        }
      });
    }

    return updated;
  }

  async softDelete(id: number) {
    await this.getById(id);

    await this.db
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(products.id, id));

    return { message: "Product deleted" };
  }

  async addImage(id: number, dto: AddProductImageDto) {
    await this.getById(id);
    await this.filesService.assertFileReady(dto.fileId);

    const [image] = await this.db
      .insert(productImages)
      .values({
        productId: id,
        fileId: dto.fileId,
        position: dto.position ?? 0,
        alt: dto.alt ?? null,
      })
      .returning();

    return image;
  }

  async reorderImages(id: number, dto: ReorderProductImagesDto) {
    await this.getById(id);

    const existing = await this.db
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, id));

    const existingIds = new Set(existing.map((row) => row.id));

    if (dto.imageIds.length !== existing.length) {
      throwHttpError(
        HttpStatus.BAD_REQUEST,
        "All product image ids must be included",
        "imageIds",
      );
    }

    for (const imageId of dto.imageIds) {
      if (!existingIds.has(imageId)) {
        throwHttpError(
          HttpStatus.BAD_REQUEST,
          "Image id does not belong to this product",
          "imageIds",
        );
      }
    }

    await this.db.transaction(async (tx) => {
      for (const [index, imageId] of dto.imageIds.entries()) {
        await tx
          .update(productImages)
          .set({ position: index })
          .where(
            and(eq(productImages.id, imageId), eq(productImages.productId, id)),
          );
      }
    });

    return this.db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position), asc(productImages.id));
  }

  private async getCategory(id: number) {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .limit(1);

    if (!category) {
      throwHttpError(
        HttpStatus.BAD_REQUEST,
        "Category not found",
        "categoryId",
      );
    }

    return category;
  }

  private validateSpecs(
    schema: CategorySpecSchema,
    specs: Record<string, unknown>,
  ) {
    for (const [field, definition] of Object.entries(schema)) {
      const value = specs[field];

      if (
        definition.required &&
        (value === undefined || value === null || value === "")
      ) {
        throwHttpError(
          HttpStatus.BAD_REQUEST,
          "Missing required spec field",
          field,
        );
      }

      if (value === undefined || value === null) {
        continue;
      }

      if (definition.type === "string" && typeof value !== "string") {
        throwHttpError(HttpStatus.BAD_REQUEST, "Invalid spec type", field);
      }

      if (definition.type === "number" && typeof value !== "number") {
        throwHttpError(HttpStatus.BAD_REQUEST, "Invalid spec type", field);
      }

      if (definition.type === "enum") {
        if (typeof value !== "string") {
          throwHttpError(HttpStatus.BAD_REQUEST, "Invalid spec type", field);
        }

        const options = definition.options ?? [];
        if (!options.includes(value)) {
          throwHttpError(HttpStatus.BAD_REQUEST, "Invalid enum option", field);
        }
      }
    }
  }
}
