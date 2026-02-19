import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, ne } from "drizzle-orm";
import { throwHttpError } from "../common/http-error.js";
import { slugify } from "../common/slug.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import { storeMembers, stores } from "../database/schema/index.js";
import { FilesService } from "../files/files.service.js";
import { AddStoreMemberDto } from "./dto/add-store-member.dto.js";
import { CreateStoreDto } from "./dto/create-store.dto.js";
import { UpdateStoreDto } from "./dto/update-store.dto.js";

@Injectable()
export class StoresService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly filesService: FilesService,
  ) {}

  async create(
    userId: number,
    dto: CreateStoreDto,
    logo?: Express.Multer.File,
  ) {
    const slug = await this.generateUniqueSlug(dto.name);
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

    return this.db.transaction(async (tx) => {
      const [store] = await tx
        .insert(stores)
        .values({
          name: dto.name,
          slug,
          description: dto.description ?? null,
          logoFileId,
          ownerId: userId,
        })
        .returning();

      await tx.insert(storeMembers).values({
        storeId: store.id,
        userId,
        role: "owner",
      });

      return store;
    });
  }

  async getById(id: number) {
    const [store] = await this.db
      .select()
      .from(stores)
      .where(and(eq(stores.id, id), isNull(stores.deletedAt)))
      .limit(1);

    if (!store) {
      throwHttpError(HttpStatus.NOT_FOUND, "Store not found");
    }

    return store;
  }

  async update(id: number, dto: UpdateStoreDto, logo?: Express.Multer.File) {
    const current = await this.getById(id);

    const name = dto.name ?? current.name;
    const slug =
      dto.name != null
        ? await this.generateUniqueSlug(dto.name, id)
        : current.slug;

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

    const [store] = await this.db
      .update(stores)
      .set({
        name,
        slug,
        description: dto.description,
        logoFileId,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, id))
      .returning();

    return store;
  }

  async softDelete(id: number) {
    await this.getById(id);

    await this.db
      .update(stores)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(stores.id, id));

    return { message: "Store deleted" };
  }

  async addMember(storeId: number, dto: AddStoreMemberDto) {
    await this.getById(storeId);

    const [existing] = await this.db
      .select()
      .from(storeMembers)
      .where(
        and(
          eq(storeMembers.storeId, storeId),
          eq(storeMembers.userId, dto.userId),
        ),
      )
      .limit(1);

    if (existing) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "User is already a store member",
        "userId",
      );
    }

    const [member] = await this.db
      .insert(storeMembers)
      .values({
        storeId,
        userId: dto.userId,
        role: dto.role,
      })
      .returning();

    return member;
  }

  async removeMember(storeId: number, userId: number) {
    await this.getById(storeId);

    const result = await this.db
      .delete(storeMembers)
      .where(
        and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, userId)),
      )
      .returning();

    if (result.length === 0) {
      throwHttpError(HttpStatus.NOT_FOUND, "Store member not found");
    }

    return { message: "Store member removed" };
  }

  private async generateUniqueSlug(
    name: string,
    excludeStoreId?: number,
  ): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let counter = 2;

    while (true) {
      const [existing] = await this.db
        .select({ id: stores.id })
        .from(stores)
        .where(
          excludeStoreId != null
            ? and(eq(stores.slug, slug), ne(stores.id, excludeStoreId))
            : eq(stores.slug, slug),
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
