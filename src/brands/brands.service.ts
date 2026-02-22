import { subject } from "@casl/ability";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import { Action, CaslAbilityFactory } from "../auth/casl/index.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { throwHttpError } from "../common/http-error.js";
import { generateUniqueSlug } from "../common/slug.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import { brands } from "../database/schema/index.js";
import { CreateBrandDto } from "./dto/create-brand.dto.js";
import { UpdateBrandDto } from "./dto/update-brand.dto.js";

@Injectable()
export class BrandsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async list() {
    return this.db.query.brands.findMany({
      where: (table) => isNull(table.deletedAt),
      orderBy: (table) => [asc(table.name)],
    });
  }

  private assertBrandCasl(user: AuthenticatedUser, action: Action) {
    const ability = this.caslAbilityFactory.createForUser(user);
    const allowed = ability.can(action, subject("Brand", {}));

    if (!allowed) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "You do not have permission for this action",
      );
    }
  }

  async create(user: AuthenticatedUser, dto: CreateBrandDto) {
    this.assertBrandCasl(user, Action.Create);
    const slug = generateUniqueSlug(dto.name);
    const [row] = await this.db
      .insert(brands)
      .values({ name: dto.name, slug })
      .returning();
    return row;
  }

  async update(id: number, user: AuthenticatedUser, dto: UpdateBrandDto) {
    this.assertBrandCasl(user, Action.Update);

    const current = await this.db.query.brands.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
    });

    if (!current) {
      throwHttpError(HttpStatus.NOT_FOUND, "Brand not found");
    }

    const name = dto.name ?? current.name;
    const slug = dto.name != null ? generateUniqueSlug(dto.name) : current.slug;

    const [row] = await this.db
      .update(brands)
      .set({ name, slug, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();

    return row;
  }
}
