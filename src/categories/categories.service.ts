import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { throwHttpError } from "../common/http-error.js";
import { slugify } from "../common/slug.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import {
  categories,
  type Category,
  type CategorySpecSchema,
} from "../database/schema/index.js";
import { CreateCategoryDto } from "./dto/create-category.dto.js";
import { ReplaceSpecSchemaDto } from "./dto/replace-spec-schema.dto.js";
import { UpdateCategoryDto } from "./dto/update-category.dto.js";

@Injectable()
export class CategoriesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listHierarchy() {
    const rows = await this.db
      .select()
      .from(categories)
      .where(isNull(categories.deletedAt))
      .orderBy(asc(categories.position), asc(categories.id));

    const byParent = new Map<number | null, Category[]>();
    for (const row of rows) {
      const key = row.parentId ?? null;
      const list = byParent.get(key) ?? [];
      list.push(row);
      byParent.set(key, list);
    }

    const makeTree = (parentId: number | null): unknown[] => {
      const children = byParent.get(parentId) ?? [];
      return children.map((category) => ({
        ...category,
        children: makeTree(category.id),
      }));
    };

    return makeTree(null);
  }

  async create(dto: CreateCategoryDto) {
    const slug = await this.generateUniqueSlug(dto.name);

    const [row] = await this.db
      .insert(categories)
      .values({
        parentId: dto.parentId ?? null,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        position: dto.position ?? 0,
        isActive: dto.isActive ?? true,
        specSchema: dto.specSchema ?? {},
      })
      .returning();

    return row;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const current = await this.getById(id);

    const name = dto.name ?? current.name;
    const slug =
      dto.name != null
        ? await this.generateUniqueSlug(dto.name, id)
        : current.slug;

    const [updated] = await this.db
      .update(categories)
      .set({
        parentId: dto.parentId,
        name,
        slug,
        description: dto.description,
        icon: dto.icon,
        position: dto.position,
        isActive: dto.isActive,
        specSchema: dto.specSchema,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return updated;
  }

  async getSpecSchema(id: number): Promise<CategorySpecSchema> {
    const category = await this.getById(id);
    return category.specSchema ?? {};
  }

  async replaceSpecSchema(id: number, dto: ReplaceSpecSchemaDto) {
    await this.getById(id);

    const [updated] = await this.db
      .update(categories)
      .set({ specSchema: dto.specSchema, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();

    return updated.specSchema ?? {};
  }

  async getById(id: number): Promise<Category> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .limit(1);

    if (!row) {
      throwHttpError(HttpStatus.NOT_FOUND, "Category not found");
    }

    return row;
  }

  private async generateUniqueSlug(
    name: string,
    excludeCategoryId?: number,
  ): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let counter = 2;

    while (true) {
      const [existing] = await this.db
        .select({ id: categories.id })
        .from(categories)
        .where(
          excludeCategoryId != null
            ? and(
                eq(categories.slug, slug),
                ne(categories.id, excludeCategoryId),
              )
            : eq(categories.slug, slug),
        )
        .limit(1);

      if (!existing) {
        return slug;
      }

      slug = `${base}-${counter}`;
      counter += 1;
    }
  }
}
