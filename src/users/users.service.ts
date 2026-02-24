import { ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import sharp from "sharp";
import { AuthService } from "../auth/auth.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { users, type NewUser, type User } from "../database/schema/index";
import { FilesService } from "../files/files.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersRepository } from "./users.repository";

@Injectable()
export class UsersService {
  private readonly profilePictureSize: number;

  constructor(
    private readonly usersRepository: UsersRepository,
    private authService: AuthService,
    private filesService: FilesService,
    private readonly configService: ConfigService,
  ) {
    this.profilePictureSize = this.configService.getOrThrow<number>(
      "USER_PROFILE_PICTURE_SIZE",
    );
  }

  async findById(id: number): Promise<User | undefined> {
    return this.usersRepository.findById(id);
  }

  async findAuthenticatedById(
    id: number,
  ): Promise<AuthenticatedUser | undefined> {
    return this.usersRepository.findAuthenticatedById(id) as Promise<
      AuthenticatedUser | undefined
    >;
  }

  async findByPhone(phone: string): Promise<User | undefined> {
    return this.usersRepository.findByPhone(phone);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findByEmail(email);
  }

  async create(data: NewUser): Promise<User> {
    return this.usersRepository.create(data);
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.usersRepository.updateLastLogin(id);
  }

  async markPhoneVerified(id: number): Promise<void> {
    await this.usersRepository.markPhoneVerified(id);
  }

  async markEmailVerified(id: number): Promise<void> {
    await this.usersRepository.markEmailVerified(id);
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

    if (currentUser.email == updateData.email) {
      // Email is the same as current, no change needed
      delete updateData.email; // Remove email from update data
    } else if (updateData.email) {
      const existingUser = await this.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== currentUser.id) {
        throw new ConflictException("Email already in use");
      }
      updateData.isEmailVerified = false;
    }

    let newProfilePictureId: number | undefined;
    // Process profile picture if provided
    if (profilePicture) {
      const processedBuffer = await this.processProfileImage(
        profilePicture.buffer,
      );

      const fileRecord = await this.filesService.uploadFromBuffer(
        "profileMedia",
        processedBuffer,
        "profile.jpg",
        "image/jpeg",
        id,
      );

      newProfilePictureId = fileRecord.id;
    }

    return this.usersRepository.transaction(async (tx) => {
      if (!updateData.isEmailVerified && updateData.email) {
        // If email changed and is not verified, send verification code
        await this.authService.sendEmailOtp(
          updateData.email,
          currentUser.id,
          tx,
        );
      }

      if (profilePicture) {
        if (currentUser.profilePictureId != null) {
          await this.filesService
            .softDelete(currentUser.profilePictureId, tx)
            .catch(() => {
              // Old file cleanup is best-effort
            });
        }

        updateData.profilePictureId = newProfilePictureId;
      }

      return this.usersRepository.updateById(id, updateData, tx);
    });
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
      .resize(this.profilePictureSize, this.profilePictureSize, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  }
}
