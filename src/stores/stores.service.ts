import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { generateUniqueSlug } from "../common/slug.js";
import { StoreMemberRole } from "../database/schema/index.js";
import { FilesService } from "../files/files.service.js";
import { AddStoreMemberDto } from "./dto/add-store-member.dto.js";
import { CreateStoreDto } from "./dto/create-store.dto.js";
import { UpdateStoreDto } from "./dto/update-store.dto.js";
import { StoresRepository } from "./stores.repository.js";

@Injectable()
export class StoresService {
  constructor(
    private readonly storesRepository: StoresRepository,
    private readonly filesService: FilesService,
  ) {}

  async create(
    userId: number,
    dto: CreateStoreDto,
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

    return this.storesRepository.transaction(async (tx) => {
      const store = await this.storesRepository.createStore(
        {
          name: dto.name,
          slug,
          description: dto.description ?? null,
          logoFileId,
          ownerId: userId,
        },
        tx,
      );

      await this.storesRepository.createStoreMember(
        {
          storeId: store.id,
          userId,
          role: StoreMemberRole.Owner,
        },
        tx,
      );

      return store;
    });
  }

  async getById(id: number) {
    const store = await this.storesRepository.findActiveStoreById(id);

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    return store;
  }

  async getMemberRole(userId: number, storeId: number) {
    const member = await this.storesRepository.findActiveMemberRole(
      userId,
      storeId,
    );

    return member?.role ?? null;
  }

  async update(id: number, dto: UpdateStoreDto, logo?: Express.Multer.File) {
    const current = await this.getById(id);

    const name = dto.name ?? current.name;
    const slug = dto.name != null ? generateUniqueSlug(dto.name) : current.slug;

    let logoFileId = current.logoFileId;

    if (logo) {
      if (current.logoFileId != null) {
        await this.filesService.softDelete(current.logoFileId).catch(() => {
          // best effort old logo cleanup
        });
      }

      logoFileId = (
        await this.filesService.uploadFromBuffer(
          "productMedia",
          logo.buffer,
          logo.originalname,
          logo.mimetype,
        )
      ).id;
    }

    return this.storesRepository.updateStoreById(
      id,
      dto,
      name,
      slug,
      logoFileId,
    );
  }

  async softDelete(id: number) {
    await this.getById(id);

    await this.storesRepository.softDeleteStoreById(id);

    return { message: "Store deleted" };
  }

  async addMember(storeId: number, dto: AddStoreMemberDto) {
    await this.getById(storeId);

    const existing = await this.storesRepository.findStoreMember(
      storeId,
      dto.userId,
    );

    if (existing) {
      throw new ConflictException("User is already a store member", "userId");
    }

    return this.storesRepository.createMember(storeId, dto.userId, dto.role);
  }

  async removeMember(storeId: number, userId: number) {
    await this.getById(storeId);

    const result = await this.storesRepository.removeMember(storeId, userId);

    if (result.length === 0) {
      throw new NotFoundException("Store member not found");
    }

    return { message: "Store member removed" };
  }
}
