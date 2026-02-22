import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  categories,
  type Category,
  type CategorySpecSchema,
  type NewCategory,
} from "../database/schema/index";
import type { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  listActive(txContext: TXContext = this.db): Promise<Category[]> {
    return txContext.query.categories.findMany({
      where: (table) => isNull(table.deletedAt),
      orderBy: (table) => [asc(table.position), asc(table.id)],
    });
  }

  async create(
    data: NewCategory,
    txContext: TXContext = this.db,
  ): Promise<Category> {
    const [created] = await txContext
      .insert(categories)
      .values(data)
      .returning();
    return created;
  }

  async updateById(
    id: number,
    data: UpdateCategoryDto & { name: string; slug: string },
    txContext: TXContext = this.db,
  ): Promise<Category> {
    const [updated] = await txContext
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();

    return updated;
  }

  async updateSpecSchema(
    id: number,
    specSchema: CategorySpecSchema,
    txContext: TXContext = this.db,
  ): Promise<Category> {
    const [updated] = await txContext
      .update(categories)
      .set({ specSchema, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();

    return updated;
  }

  findActiveById(
    id: number,
    txContext: TXContext = this.db,
  ): Promise<Category | undefined> {
    return txContext.query.categories.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
    });
  }
}
