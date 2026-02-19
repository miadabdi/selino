import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { throwHttpError } from "../common/http-error.js";
import { slugify } from "../common/slug.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import { brands } from "../database/schema/index.js";
import { CreateBrandDto } from "./dto/create-brand.dto.js";
import { UpdateBrandDto } from "./dto/update-brand.dto.js";

@Injectable()
export class BrandsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list() {
    return this.db
      .select()
      .from(brands)
      .where(isNull(brands.deletedAt))
      .orderBy(asc(brands.name));
  }

  async create(dto: CreateBrandDto) {
    const slug = await this.generateUniqueSlug(dto.name);
    const [row] = await this.db
      .insert(brands)
      .values({ name: dto.name, slug })
      .returning();
    return row;
  }

  async update(id: number, dto: UpdateBrandDto) {
    const [existing] = await this.db
      .select({ id: brands.id })
      .from(brands)
      .where(and(eq(brands.id, id), isNull(brands.deletedAt)))
      .limit(1);

    if (!existing) {
      throwHttpError(HttpStatus.NOT_FOUND, "Brand not found");
    }

    const current = await this.db
      .select()
      .from(brands)
      .where(eq(brands.id, id))
      .limit(1);

    const name = dto.name ?? current[0].name;
    const slug =
      dto.name != null
        ? await this.generateUniqueSlug(dto.name, id)
        : current[0].slug;

    const [row] = await this.db
      .update(brands)
      .set({ name, slug, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();

    return row;
  }

  private async generateUniqueSlug(
    name: string,
    excludeBrandId?: number,
  ): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let counter = 2;

    while (true) {
      const [existing] = await this.db
        .select({ id: brands.id })
        .from(brands)
        .where(
          excludeBrandId != null
            ? and(eq(brands.slug, slug), ne(brands.id, excludeBrandId))
            : eq(brands.slug, slug),
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
