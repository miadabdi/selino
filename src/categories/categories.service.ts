import { subject } from "@casl/ability";
import { HttpStatus, Injectable } from "@nestjs/common";
import { Action, CaslAbilityFactory } from "../auth/casl/index";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { throwHttpError } from "../common/http-error";
import { generateUniqueSlug } from "../common/slug";
import {
  type Category,
  type CategorySpecSchema,
} from "../database/schema/index";
import { CategoriesRepository } from "./categories.repository";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { ReplaceSpecSchemaDto } from "./dto/replace-spec-schema.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
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
    const rows = await this.categoriesRepository.listActive();

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

    return this.categoriesRepository.create({
      parentId: dto.parentId ?? null,
      name: dto.name,
      slug,
      description: dto.description ?? null,
      icon: dto.icon ?? null,
      position: dto.position ?? 0,
      isActive: dto.isActive ?? true,
      specSchema: dto.specSchema ?? {},
    });
  }

  async update(user: AuthenticatedUser, id: number, dto: UpdateCategoryDto) {
    this.assertCategoryCasl(user, Action.Update);
    const current = await this.getById(id);

    const name = dto.name ?? current.name;
    const slug = dto.name != null ? generateUniqueSlug(dto.name) : current.slug;

    return this.categoriesRepository.updateById(id, {
      parentId: dto.parentId,
      name,
      slug,
      description: dto.description,
      icon: dto.icon,
      position: dto.position,
      isActive: dto.isActive,
      specSchema: dto.specSchema,
    });
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

    const updated = await this.categoriesRepository.updateSpecSchema(
      id,
      dto.specSchema,
    );

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
    return this.categoriesRepository.findActiveById(id);
  }
}
