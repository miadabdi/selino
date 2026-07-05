import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { generateUniqueSlug } from "../common/slug";
import { FilesService } from "../files/files.service";
import { AddBusinessMemberDto } from "./dto/add-business-member.dto";
import { CreateBusinessAccountDto } from "./dto/create-business-account.dto";
import { UpdateBusinessAccountDto } from "./dto/update-business-account.dto";
import { BusinessAccountsRepository } from "./business-accounts.repository";

const DEFAULT_BUSINESS_OWNER_ROLE = "manager";

@Injectable()
export class BusinessAccountsService {
  constructor(
    private readonly businessAccountsRepository: BusinessAccountsRepository,
    private readonly filesService: FilesService,
  ) {}

  async create(
    userId: number,
    dto: CreateBusinessAccountDto,
    logo?: Express.Multer.File,
  ) {
    const slug = generateUniqueSlug(dto.name);
    const logoFileId = logo
      ? (
          await this.filesService.uploadFromBuffer(
            "productMedia",
            logo.buffer,
            logo.originalname,
            logo.mimetype,
            userId,
          )
        ).id
      : null;

    return this.businessAccountsRepository.transaction(async (tx) => {
      const managerRole = await this.businessAccountsRepository.ensureRole(
        DEFAULT_BUSINESS_OWNER_ROLE,
        tx,
      );
      const businessAccount =
        await this.businessAccountsRepository.createBusinessAccount(
          {
            name: dto.name,
            slug,
            type: dto.type ?? "store",
            description: dto.description ?? null,
            logoFileId,
          },
          tx,
        );

      await this.businessAccountsRepository.createBusinessMember(
        {
          businessAccountId: businessAccount.id,
          userId,
          roleId: managerRole.id,
        },
        tx,
      );

      return businessAccount;
    });
  }

  async getById(id: number) {
    const businessAccount =
      await this.businessAccountsRepository.findActiveBusinessAccountById(id);

    if (!businessAccount) {
      throw new NotFoundException("Business account not found");
    }

    return businessAccount;
  }

  async getMemberRole(userId: number, businessAccountId: number) {
    const member = await this.businessAccountsRepository.findActiveMemberRole(
      userId,
      businessAccountId,
    );

    return member?.role.name ?? null;
  }

  async update(
    id: number,
    dto: UpdateBusinessAccountDto,
    logo?: Express.Multer.File,
  ) {
    const current = await this.getById(id);

    const name = dto.name ?? current.name;
    const slug = dto.name != null ? generateUniqueSlug(dto.name) : current.slug;

    let logoFileId = current.logoFileId;

    let newLogoId: number | undefined;
    if (logo) {
      newLogoId = (
        await this.filesService.uploadFromBuffer(
          "productMedia",
          logo.buffer,
          logo.originalname,
          logo.mimetype,
        )
      ).id;
    }

    return this.businessAccountsRepository.transaction(async (tx) => {
      if (logo) {
        if (current.logoFileId != null) {
          await this.filesService
            .softDelete(current.logoFileId, tx)
            .catch(() => {
              // best effort old logo cleanup
            });
        }

        logoFileId = newLogoId!;
      }

      return this.businessAccountsRepository.updateBusinessAccountById(
        id,
        dto,
        name,
        slug,
        logoFileId,
        tx,
      );
    });
  }

  async softDelete(id: number) {
    await this.getById(id);

    await this.businessAccountsRepository.softDeleteBusinessAccountById(id);

    return { message: "Business account deleted" };
  }

  async addMember(businessAccountId: number, dto: AddBusinessMemberDto) {
    await this.getById(businessAccountId);

    const existing = await this.businessAccountsRepository.findBusinessMember(
      businessAccountId,
      dto.userId,
    );

    if (existing) {
      throw new ConflictException(
        "User is already a business account member",
        "userId",
      );
    }

    return this.businessAccountsRepository.createMember(
      businessAccountId,
      dto.userId,
      dto.role,
    );
  }

  async removeMember(businessAccountId: number, userId: number) {
    await this.getById(businessAccountId);

    const result = await this.businessAccountsRepository.removeMember(
      businessAccountId,
      userId,
    );

    if (result.length === 0) {
      throw new NotFoundException("Business account member not found");
    }

    return { message: "Business account member removed" };
  }
}
