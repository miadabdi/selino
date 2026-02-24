import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import { brands, type Brand, type NewBrand } from "../database/schema/index";

@Injectable()
export class BrandsRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  listActive(txContext: TXContext = this.db): Promise<Brand[]> {
    return txContext.query.brands.findMany({
      where: (table) => isNull(table.deletedAt),
      orderBy: (table) => [asc(table.name)],
    });
  }

  async create(data: NewBrand, txContext: TXContext = this.db): Promise<Brand> {
    const [created] = await txContext.insert(brands).values(data).returning();
    return created;
  }

  findActiveById(
    id: number,
    txContext: TXContext = this.db,
  ): Promise<Brand | undefined> {
    return txContext.query.brands.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
    });
  }

  async updateById(
    id: number,
    data: Partial<NewBrand>,
    txContext: TXContext = this.db,
  ): Promise<Brand> {
    const [updated] = await txContext
      .update(brands)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();

    return updated;
  }
}
