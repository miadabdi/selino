import { subject } from "@casl/ability";
import { HttpStatus, Injectable } from "@nestjs/common";
import { Action, CaslAbilityFactory } from "../auth/casl/index";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { throwHttpError } from "../common/http-error";
import { generateUniqueSlug } from "../common/slug";
import { BrandsRepository } from "./brands.repository";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";

@Injectable()
export class BrandsService {
  constructor(
    private readonly brandsRepository: BrandsRepository,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async list() {
    return this.brandsRepository.listActive();
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
    return this.brandsRepository.create({ name: dto.name, slug });
  }

  async update(id: number, user: AuthenticatedUser, dto: UpdateBrandDto) {
    this.assertBrandCasl(user, Action.Update);

    const current = await this.brandsRepository.findActiveById(id);

    if (!current) {
      throwHttpError(HttpStatus.NOT_FOUND, "Brand not found");
    }

    const name = dto.name ?? current.name;
    const slug = dto.name != null ? generateUniqueSlug(dto.name) : current.slug;

    return this.brandsRepository.updateById(id, { name, slug });
  }
}
