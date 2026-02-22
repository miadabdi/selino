import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import sharp from "sharp";
import { AuthService } from "../auth/auth.service.js";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import { users, type NewUser, type User } from "../database/schema/index.js";
import { FilesService } from "../files/files.service.js";
import { UpdateUserDto } from "./dto/update-user.dto.js";

/** Standard square resolution for profile pictures (px). */
const PROFILE_PICTURE_SIZE = 512;

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private authService: AuthService,
    private filesService: FilesService,
  ) {}

  async findById(id: number): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
    });
  }

  async findAuthenticatedById(
    id: number,
  ): Promise<AuthenticatedUser | undefined> {
    return this.db.query.users.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
      with: {
        storeMemberships: {
          where: (membership) => eq(membership.isActive, true),
        },
      },
    });
  }

  async findByPhone(phone: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: (table) => and(eq(table.phone, phone), isNull(table.deletedAt)),
    });
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: (table) => and(eq(table.email, email), isNull(table.deletedAt)),
    });
  }

  async create(data: NewUser): Promise<User> {
    const result = await this.db.insert(users).values(data).returning();
    return result[0];
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async markPhoneVerified(id: number): Promise<void> {
    await this.db
      .update(users)
      .set({ isPhoneVerified: true })
      .where(eq(users.id, id));
  }

  async markEmailVerified(id: number): Promise<void> {
    await this.db
      .update(users)
      .set({ isEmailVerified: true })
      .where(eq(users.id, id));
  }

  async update(
    id: number,
    data: UpdateUserDto,
    profilePicture?: Express.Multer.File,
  ): Promise<User> {
    // Get current user to check if email changed
    const currentUser = await this.findById(id);
    if (!currentUser) {
      throw new Error("User not found");
    }

    const updateData: Partial<typeof users.$inferInsert> = { ...data };

    // Process profile picture if provided
    if (profilePicture) {
      const processedBuffer = await this.processProfileImage(
        profilePicture.buffer,
      );

      // Delete old profile picture if exists
      if (currentUser.profilePictureId != null) {
        await this.filesService
          .softDelete(currentUser.profilePictureId)
          .catch(() => {
            // Old file cleanup is best-effort
          });
      }

      const fileRecord = await this.filesService.uploadFromBuffer(
        "profileMedia",
        processedBuffer,
        "profile.jpg",
        "image/jpeg",
        id,
      );

      updateData.profilePictureId = fileRecord.id;
    }

    if (currentUser.email == updateData.email) {
      // Email is the same as current, no change needed
      delete updateData.email; // Remove email from update data
    }

    // If email is being changed, mark it as unverified
    if (updateData.email && updateData.email !== currentUser.email) {
      const existingUser = await this.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== currentUser.id) {
        throw new ConflictException("Email already in use");
      }

      updateData.isEmailVerified = false;
      // If email changed, send verification code
      await this.authService.sendEmailOtp(updateData.email, currentUser.id);
    }

    const result = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return result[0];
  }

  /**
   * Find or create a user by email (used for Google OAuth).
   */
  async findOrCreateByEmail(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) return existing;

    return this.create({
      email: data.email,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      phone: data.phone ?? "",
      isEmailVerified: true,
    });
  }

  /**
   * Resolves the profile picture URL for a user.
   * Returns null if no profile picture is set.
   */
  async resolveProfilePictureUrl(user: User): Promise<string | null> {
    if (user.profilePictureId == null) {
      return null;
    }

    try {
      return await this.filesService.resolveUrl(user.profilePictureId);
    } catch {
      return null;
    }
  }

  /**
   * Converts any image buffer to a square JPEG at the standard profile
   * picture resolution, using sharp.
   */
  private async processProfileImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(PROFILE_PICTURE_SIZE, PROFILE_PICTURE_SIZE, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  }
}
