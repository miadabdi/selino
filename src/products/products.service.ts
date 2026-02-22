import { subject } from "@casl/ability";
import { HttpStatus, Injectable } from "@nestjs/common";
import { eq, isNull, sql, type SQL } from "drizzle-orm";
import { Action, CaslAbilityFactory } from "../auth/casl/index.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { CategoriesService } from "../categories/categories.service.js";
import { throwHttpError } from "../common/http-error.js";
import { products, type CategorySpecSchema } from "../database/schema/index.js";
import { FilesService } from "../files/files.service.js";
import { AddProductImageDto } from "./dto/add-product-image.dto.js";
import { CreateProductDto } from "./dto/create-product.dto.js";
import { ReorderProductImagesDto } from "./dto/reorder-product-images.dto.js";
import { UpdateProductDto } from "./dto/update-product.dto.js";
import { ProductsRepository } from "./products.repository.js";

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly filesService: FilesService,
    private readonly categoriesService: CategoriesService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  private assertProductCasl(user: AuthenticatedUser, action: Action) {
    const ability = this.caslAbilityFactory.createForUser(user);
    const allowed = ability.can(action, subject("Product", {}));

    if (!allowed) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "You do not have permission for this action",
      );
    }
  }

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

      if (
        typedCondition.eq != null &&
        (typeof typedCondition.eq === "string" ||
          typeof typedCondition.eq === "number" ||
          typeof typedCondition.eq === "boolean")
      ) {
        whereClauses.push(
          sql`${products.specs} ->> ${field} = ${String(typedCondition.eq)}`,
        );
      }
    }

    return this.productsRepository.list(whereClauses);
  }

  async create(
    dto: CreateProductDto,
    user: AuthenticatedUser,
    pictures: Express.Multer.File[] = [],
  ) {
    this.assertProductCasl(user, Action.Create);
    const category = await this.categoriesService.findActiveByIdAssert(
      dto.categoryId,
    );
    this.validateSpecs(category.specSchema ?? {}, dto.specs);

    const created = await this.productsRepository.createProduct({
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
    });

    if (pictures.length > 0) {
      const uploads = await Promise.all(
        pictures.map((picture) =>
          this.filesService.uploadFromBuffer(
            "productMedia",
            picture.buffer,
            picture.originalname,
            picture.mimetype,
            user.id,
          ),
        ),
      );

      await this.productsRepository.transaction(async (tx) => {
        for (const [index, uploaded] of uploads.entries()) {
          await this.productsRepository.createProductImage(
            {
              productId: created.id,
              fileId: uploaded.id,
              position: index,
            },
            tx,
          );
        }

        if (created.defaultImageFileId == null && uploads.length > 0) {
          await this.productsRepository.setDefaultImageFileId(
            created.id,
            uploads[0].id,
            tx,
          );
        }
      });
    }

    return created;
  }

  async getById(id: number) {
    const product = await this.productsRepository.findActiveByIdWithImages(id);

    if (!product) {
      throwHttpError(HttpStatus.NOT_FOUND, "Product not found");
    }
    return product;
  }

  async update(
    id: number,
    dto: UpdateProductDto,
    user: AuthenticatedUser,
    pictures: Express.Multer.File[] = [],
  ) {
    this.assertProductCasl(user, Action.Update);
    const current = await this.getById(id);
    const categoryId = dto.categoryId ?? current.categoryId;

    if (dto.specs != null) {
      const category =
        await this.categoriesService.findActiveByIdAssert(categoryId);
      this.validateSpecs(category.specSchema ?? {}, dto.specs);
    }

    const updated = await this.productsRepository.updateProductById(id, dto);

    if (!updated) {
      throwHttpError(HttpStatus.NOT_FOUND, "Product not found");
    }

    if (pictures.length > 0) {
      const uploads = await Promise.all(
        pictures.map((picture) =>
          this.filesService.uploadFromBuffer(
            "productMedia",
            picture.buffer,
            picture.originalname,
            picture.mimetype,
            user.id,
          ),
        ),
      );

      const startPosition =
        (await this.productsRepository.getMaxImagePosition(id)) + 1;

      await this.productsRepository.transaction(async (tx) => {
        for (const [index, uploaded] of uploads.entries()) {
          await this.productsRepository.createProductImage(
            {
              productId: id,
              fileId: uploaded.id,
              position: startPosition + index,
            },
            tx,
          );
        }

        if (updated.defaultImageFileId == null && uploads.length > 0) {
          await this.productsRepository.setDefaultImageFileId(
            id,
            uploads[0].id,
            tx,
          );
        }
      });
    }

    return updated;
  }

  async softDelete(id: number) {
    await this.getById(id);

    await this.productsRepository.softDeleteById(id);

    return { message: "Product deleted" };
  }

  async addImage(id: number, dto: AddProductImageDto) {
    await this.getById(id);
    await this.filesService.assertFileReady(dto.fileId);

    const image = await this.productsRepository.createProductImage({
      productId: id,
      fileId: dto.fileId,
      position: dto.position ?? 0,
      alt: dto.alt ?? null,
    });

    return image;
  }

  async reorderImages(id: number, dto: ReorderProductImagesDto) {
    await this.getById(id);

    const existing = await this.productsRepository.listImageIds(id);

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

    await this.productsRepository.transaction(async (tx) => {
      for (const [index, imageId] of dto.imageIds.entries()) {
        await this.productsRepository.updateImagePosition(
          id,
          imageId,
          index,
          tx,
        );
      }
    });

    return this.productsRepository.listImagesByProductId(id);
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
