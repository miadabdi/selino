import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { AuthService } from "../auth/auth.service.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import { users, type NewUser, type User } from "../database/schema/index.js";
import { FilesService } from "../files/files.service.js";
import {
  STORAGE_BUCKETS,
  type StorageBucketsConfig,
} from "../storage/index.js";
import { UpdateUserDto } from "./dto/update-user.dto.js";

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private authService: AuthService,
    private filesService: FilesService,
    @Inject(STORAGE_BUCKETS)
    private readonly storageBuckets: StorageBucketsConfig,
  ) {}

  async findById(id: number): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    return result[0];
  }

  async findByPhone(phone: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
      .limit(1);

    return result[0];
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    return result[0];
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

  async update(id: number, data: UpdateUserDto): Promise<User> {
    // Get current user to check if email changed
    const currentUser = await this.findById(id);
    if (!currentUser) {
      throw new Error("User not found");
    }

    const updateData: Partial<typeof users.$inferInsert> = { ...data };

    // If profilePictureId is being set, validate the file is ready and in
    // the correct bucket before allowing the association.
    if (updateData.profilePictureId != null) {
      const file = await this.filesService.assertFileReady(
        updateData.profilePictureId,
      );

      // Ensure the file belongs to the profileMedia bucket
      if (file.bucketName !== this.storageBuckets.profileMedia.bucketName) {
        throw new ConflictException(
          "Profile picture must be uploaded to the profileMedia bucket",
        );
      }
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
}
