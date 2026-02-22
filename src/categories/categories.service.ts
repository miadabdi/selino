import { subject } from "@casl/ability";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import { Action, CaslAbilityFactory } from "../auth/casl/index.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { throwHttpError } from "../common/http-error.js";
import { generateUniqueSlug } from "../common/slug.js";
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
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  private assertCategoryCasl(user: AuthenticatedUser, action: Action) {
    const ability = this.caslAbilityFactory.createForUser(user);
    const allowed = ability.can(action, subject("Category", {}));

    if (!allowed) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "You do not have permission for this action",
      );
    }
  }

  async listHierarchy() {
    const rows = await this.db.query.categories.findMany({
      where: (table) => isNull(table.deletedAt),
      orderBy: (table) => [asc(table.position), asc(table.id)],
    });

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

  async create(user: AuthenticatedUser, dto: CreateCategoryDto) {
    this.assertCategoryCasl(user, Action.Create);
    const slug = generateUniqueSlug(dto.name);

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

  async update(user: AuthenticatedUser, id: number, dto: UpdateCategoryDto) {
    this.assertCategoryCasl(user, Action.Update);
    const current = await this.getById(id);

    const name = dto.name ?? current.name;
    const slug = dto.name != null ? generateUniqueSlug(dto.name) : current.slug;

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

  async replaceSpecSchema(
    user: AuthenticatedUser,
    id: number,
    dto: ReplaceSpecSchemaDto,
  ) {
    this.assertCategoryCasl(user, Action.Update);
    await this.getById(id);

    const [updated] = await this.db
      .update(categories)
      .set({ specSchema: dto.specSchema, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();

    return updated.specSchema ?? {};
  }

  async findActiveByIdAssert(id: number): Promise<Category> {
    const row = await this.findActiveById(id);

    if (!row) {
      throwHttpError(HttpStatus.BAD_REQUEST, "Category not found");
    }

    return row;
  }

  async getById(id: number): Promise<Category> {
    const row = await this.findActiveById(id);

    if (!row) {
      throwHttpError(HttpStatus.NOT_FOUND, "Category not found");
    }

    return row;
  }

  private async findActiveById(id: number): Promise<Category | undefined> {
    return this.db.query.categories.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
    });
  }
}
