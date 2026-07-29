import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { findMembershipWithPermission } from "../auth/permissions/index.js";
import { generateUniqueSlug } from "../common/slug";
import { FilesService } from "../files/files.service";
import { AddBusinessMemberDto } from "./dto/add-business-member.dto";
import { CreateBusinessAddressDto } from "./dto/create-business-address.dto.js";
import { CreateBusinessAccountDto } from "./dto/create-business-account.dto";
import { UpdateBusinessAddressDto } from "./dto/update-business-address.dto.js";
import { UpdateBusinessAccountDto } from "./dto/update-business-account.dto";
import { UpdateBusinessMemberDto } from "./dto/update-business-member.dto.js";
import { BusinessAccountsRepository } from "./business-accounts.repository";

const DEFAULT_BUSINESS_OWNER_ROLE = "manager";
const BUSINESS_PROFILE_READ_PERMISSIONS = [
  "manager.dashboard.overview",
  "seller.dashboard.overview",
] as const;
const BUSINESS_PROFILE_MANAGE_PERMISSIONS = [
  "manager.dashboard.overview",
] as const;
const BUSINESS_TEAM_READ_PERMISSIONS = [
  "manager.team.read",
  "seller.team.read",
] as const;
const BUSINESS_TEAM_MANAGE_PERMISSIONS = [
  "manager.team.manage",
  "seller.team.manage",
] as const;

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
    const activeMembership =
      await this.businessAccountsRepository.findActiveMembershipByUserId(
        userId,
      );
    if (activeMembership) {
      throw new ConflictException(
        "User already belongs to an active business account",
      );
    }

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
      const concurrentMembership =
        await this.businessAccountsRepository.findActiveMembershipByUserId(
          userId,
          tx,
        );
      if (concurrentMembership) {
        throw new ConflictException(
          "User already belongs to an active business account",
        );
      }

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

  async getProfile(user: AuthenticatedUser, id: number) {
    this.assertAnyBusinessPermission(
      user,
      id,
      BUSINESS_PROFILE_READ_PERMISSIONS,
    );
    const businessAccount = await this.getById(id);

    const [logoUrl, licenseUrl] = await Promise.all([
      this.resolveFileUrl(businessAccount.logoFileId),
      this.resolveFileUrl(businessAccount.licenseFileId),
    ]);

    return { ...businessAccount, logoUrl, licenseUrl };
  }

  async getMemberRole(userId: number, businessAccountId: number) {
    const member = await this.businessAccountsRepository.findActiveMemberRole(
      userId,
      businessAccountId,
    );

    return member?.role.name ?? null;
  }

  async update(
    user: AuthenticatedUser,
    id: number,
    dto: UpdateBusinessAccountDto,
    logo?: Express.Multer.File,
    license?: Express.Multer.File,
  ) {
    this.assertAnyBusinessPermission(
      user,
      id,
      BUSINESS_PROFILE_MANAGE_PERMISSIONS,
    );
    const current = await this.getById(id);

    const name = dto.name ?? current.name;
    const slug = dto.name != null ? generateUniqueSlug(dto.name) : current.slug;
    const licenseIssuedAt =
      dto.licenseIssuedAt === undefined
        ? current.licenseIssuedAt
        : dto.licenseIssuedAt;
    const licenseExpiresAt =
      dto.licenseExpiresAt === undefined
        ? current.licenseExpiresAt
        : dto.licenseExpiresAt;
    if (
      licenseIssuedAt != null &&
      licenseExpiresAt != null &&
      licenseExpiresAt < licenseIssuedAt
    ) {
      throw new BadRequestException(
        "Business license expiry must follow its issue date",
      );
    }

    let logoFileId = current.logoFileId;
    let licenseFileId = current.licenseFileId;

    let newLogoId: number | undefined;
    if (logo) {
      newLogoId = (
        await this.filesService.uploadFromBuffer(
          "productMedia",
          logo.buffer,
          logo.originalname,
          logo.mimetype,
          user.id,
        )
      ).id;
    }
    let newLicenseId: number | undefined;
    if (license) {
      newLicenseId = (
        await this.filesService.uploadFromBuffer(
          "productMedia",
          license.buffer,
          license.originalname,
          license.mimetype,
          user.id,
        )
      ).id;
    }

    const updated = await this.businessAccountsRepository.transaction(
      async (tx) => {
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
        if (license) {
          if (current.licenseFileId != null) {
            await this.filesService
              .softDelete(current.licenseFileId, tx)
              .catch(() => {
                // best effort old license cleanup
              });
          }
          licenseFileId = newLicenseId!;
        }

        return this.businessAccountsRepository.updateBusinessAccountById(
          id,
          dto,
          name,
          slug,
          logoFileId,
          licenseFileId,
          tx,
        );
      },
    );

    return {
      ...updated,
      logoUrl: await this.resolveFileUrl(updated.logoFileId),
      licenseUrl: await this.resolveFileUrl(updated.licenseFileId),
    };
  }

  async softDelete(user: AuthenticatedUser, id: number) {
    this.assertAnyBusinessPermission(
      user,
      id,
      BUSINESS_PROFILE_MANAGE_PERMISSIONS,
    );
    await this.getById(id);

    await this.businessAccountsRepository.softDeleteBusinessAccountById(id);

    return { message: "Business account deleted" };
  }

  async listMembers(user: AuthenticatedUser, businessAccountId: number) {
    this.assertAnyBusinessPermission(
      user,
      businessAccountId,
      BUSINESS_TEAM_READ_PERMISSIONS,
    );
    await this.getById(businessAccountId);

    return this.businessAccountsRepository.listBusinessMembers(
      businessAccountId,
    );
  }

  async getMember(
    user: AuthenticatedUser,
    businessAccountId: number,
    memberUserId: number,
  ) {
    this.assertAnyBusinessPermission(
      user,
      businessAccountId,
      BUSINESS_TEAM_READ_PERMISSIONS,
    );
    await this.getById(businessAccountId);

    const member =
      await this.businessAccountsRepository.findBusinessMemberDetails(
        businessAccountId,
        memberUserId,
      );
    if (!member) {
      throw new NotFoundException("Business account member not found");
    }

    return member;
  }

  async addMember(
    user: AuthenticatedUser,
    businessAccountId: number,
    dto: AddBusinessMemberDto,
  ) {
    this.assertAnyBusinessPermission(
      user,
      businessAccountId,
      BUSINESS_TEAM_MANAGE_PERMISSIONS,
    );
    await this.getById(businessAccountId);

    const targetUser = await this.businessAccountsRepository.findActiveUserById(
      dto.userId,
    );
    if (!targetUser) {
      throw new NotFoundException("User not found");
    }

    const existing = await this.businessAccountsRepository.findBusinessMember(
      businessAccountId,
      dto.userId,
    );

    if (existing?.isActive) {
      throw new ConflictException(
        "User is already a business account member",
        "userId",
      );
    }

    const activeMembership =
      await this.businessAccountsRepository.findActiveMembershipByUserId(
        dto.userId,
      );
    if (activeMembership) {
      throw new ConflictException(
        "User already belongs to an active business account",
        "userId",
      );
    }

    if (existing) {
      await this.businessAccountsRepository.updateMember(
        businessAccountId,
        dto.userId,
        dto.role,
        true,
      );
    } else {
      await this.businessAccountsRepository.createMember(
        businessAccountId,
        dto.userId,
        dto.role,
      );
    }

    return this.businessAccountsRepository.findBusinessMemberDetails(
      businessAccountId,
      dto.userId,
    );
  }

  async updateMember(
    user: AuthenticatedUser,
    businessAccountId: number,
    memberUserId: number,
    dto: UpdateBusinessMemberDto,
  ) {
    this.assertAnyBusinessPermission(
      user,
      businessAccountId,
      BUSINESS_TEAM_MANAGE_PERMISSIONS,
    );
    await this.getById(businessAccountId);
    if (dto.role == null && dto.isActive == null) {
      throw new BadRequestException("At least one member field is required");
    }

    const member =
      await this.businessAccountsRepository.findBusinessMemberDetails(
        businessAccountId,
        memberUserId,
      );
    if (!member) {
      throw new NotFoundException("Business account member not found");
    }

    await this.assertManagerContinuity(
      businessAccountId,
      memberUserId,
      member.role.name,
      member.isActive,
      dto.role,
      dto.isActive,
    );
    await this.businessAccountsRepository.updateMember(
      businessAccountId,
      memberUserId,
      dto.role,
      dto.isActive,
    );

    return this.businessAccountsRepository.findBusinessMemberDetails(
      businessAccountId,
      memberUserId,
    );
  }

  async removeMember(
    user: AuthenticatedUser,
    businessAccountId: number,
    memberUserId: number,
  ) {
    this.assertAnyBusinessPermission(
      user,
      businessAccountId,
      BUSINESS_TEAM_MANAGE_PERMISSIONS,
    );
    await this.getById(businessAccountId);

    const member =
      await this.businessAccountsRepository.findBusinessMemberDetails(
        businessAccountId,
        memberUserId,
      );
    if (!member?.isActive) {
      throw new NotFoundException("Business account member not found");
    }

    await this.assertManagerContinuity(
      businessAccountId,
      memberUserId,
      member.role.name,
      member.isActive,
      undefined,
      false,
    );
    const result = await this.businessAccountsRepository.deactivateMember(
      businessAccountId,
      memberUserId,
    );

    if (result.length === 0) {
      throw new NotFoundException("Business account member not found");
    }

    return { message: "Business account member removed" };
  }

  async listAddresses(user: AuthenticatedUser, businessAccountId: number) {
    this.assertAnyBusinessPermission(
      user,
      businessAccountId,
      BUSINESS_PROFILE_READ_PERMISSIONS,
    );
    await this.getById(businessAccountId);

    return this.businessAccountsRepository.listAddresses(businessAccountId);
  }

  async getAddress(
    user: AuthenticatedUser,
    businessAccountId: number,
    addressId: number,
  ) {
    this.assertAnyBusinessPermission(
      user,
      businessAccountId,
      BUSINESS_PROFILE_READ_PERMISSIONS,
    );
    await this.getById(businessAccountId);

    return this.findAddressOrThrow(businessAccountId, addressId);
  }

  async createAddress(
    user: AuthenticatedUser,
    businessAccountId: number,
    dto: CreateBusinessAddressDto,
  ) {
    this.assertAnyBusinessPermission(
      user,
      businessAccountId,
      BUSINESS_PROFILE_MANAGE_PERMISSIONS,
    );
    await this.getById(businessAccountId);
    this.assertCoordinatePair(dto.latitude, dto.longitude);
    this.assertDefaultAddressIsActive(dto.isDefault, dto.isActive);

    return this.businessAccountsRepository.transaction(async (tx) => {
      if (dto.isDefault === true) {
        await this.businessAccountsRepository.unsetDefaultAddresses(
          businessAccountId,
          undefined,
          user.id,
          tx,
        );
      }

      return this.businessAccountsRepository.createAddress(
        {
          ...dto,
          businessAccountId,
          countryCode: dto.countryCode?.toUpperCase() ?? "IR",
          createdBy: user.id,
          updatedBy: user.id,
        },
        tx,
      );
    });
  }

  async updateAddress(
    user: AuthenticatedUser,
    businessAccountId: number,
    addressId: number,
    dto: UpdateBusinessAddressDto,
  ) {
    this.assertAnyBusinessPermission(
      user,
      businessAccountId,
      BUSINESS_PROFILE_MANAGE_PERMISSIONS,
    );
    await this.getById(businessAccountId);
    const current = await this.findAddressOrThrow(businessAccountId, addressId);
    this.assertCoordinatePair(
      dto.latitude === undefined
        ? (current.latitude ?? undefined)
        : dto.latitude,
      dto.longitude === undefined
        ? (current.longitude ?? undefined)
        : dto.longitude,
    );
    this.assertDefaultAddressIsActive(
      dto.isDefault ?? current.isDefault,
      dto.isActive ?? current.isActive,
    );

    const normalizedDto = {
      ...dto,
      countryCode: dto.countryCode?.toUpperCase(),
    };

    return this.businessAccountsRepository.transaction(async (tx) => {
      if (dto.isDefault === true) {
        await this.businessAccountsRepository.unsetDefaultAddresses(
          businessAccountId,
          addressId,
          user.id,
          tx,
        );
      }

      return this.businessAccountsRepository.updateAddress(
        addressId,
        normalizedDto,
        user.id,
        tx,
      );
    });
  }

  async removeAddress(
    user: AuthenticatedUser,
    businessAccountId: number,
    addressId: number,
  ) {
    this.assertAnyBusinessPermission(
      user,
      businessAccountId,
      BUSINESS_PROFILE_MANAGE_PERMISSIONS,
    );
    await this.getById(businessAccountId);
    await this.findAddressOrThrow(businessAccountId, addressId);
    await this.businessAccountsRepository.softDeleteAddress(addressId, user.id);

    return { message: "Business address removed" };
  }

  private async findAddressOrThrow(
    businessAccountId: number,
    addressId: number,
  ) {
    const address = await this.businessAccountsRepository.findAddressById(
      businessAccountId,
      addressId,
    );
    if (!address) {
      throw new NotFoundException("Business address not found");
    }

    return address;
  }

  private assertAnyBusinessPermission(
    user: AuthenticatedUser,
    businessAccountId: number,
    permissions: readonly string[],
  ): void {
    const allowed =
      user.isAdmin === true ||
      user.permissions.includes("*") ||
      permissions.some((permission) =>
        Boolean(
          findMembershipWithPermission(user, permission, businessAccountId),
        ),
      );
    if (!allowed) {
      throw new ForbiddenException(
        "You do not have permission for this action",
      );
    }
  }

  private async assertManagerContinuity(
    businessAccountId: number,
    memberUserId: number,
    currentRole: string,
    currentIsActive: boolean,
    nextRole: string | undefined,
    nextIsActive: boolean | undefined,
  ): Promise<void> {
    const removesManager =
      currentIsActive &&
      currentRole === DEFAULT_BUSINESS_OWNER_ROLE &&
      (nextRole != null && nextRole !== DEFAULT_BUSINESS_OWNER_ROLE
        ? true
        : nextIsActive === false);
    if (!removesManager) {
      return;
    }

    const otherManagers =
      await this.businessAccountsRepository.countOtherActiveManagers(
        businessAccountId,
        memberUserId,
      );
    if (otherManagers === 0) {
      throw new ConflictException(
        "A business account must keep at least one active manager",
      );
    }
  }

  private assertCoordinatePair(
    latitude: number | undefined,
    longitude: number | undefined,
  ): void {
    if ((latitude == null) !== (longitude == null)) {
      throw new BadRequestException(
        "Latitude and longitude must be provided together",
      );
    }
  }

  private assertDefaultAddressIsActive(
    isDefault: boolean | undefined,
    isActive: boolean | undefined,
  ): void {
    if (isDefault === true && isActive === false) {
      throw new BadRequestException("The default address must be active");
    }
  }

  private async resolveFileUrl(fileId: number | null): Promise<string | null> {
    if (fileId == null) {
      return null;
    }

    return this.filesService.resolveUrl(fileId).catch(() => null);
  }
}
