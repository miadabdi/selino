import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { extname } from "path";
import { v4 as uuidv4 } from "uuid";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import {
  files,
  type FileRecord,
  type NewFileRecord,
} from "../database/schema/index.js";
import {
  STORAGE_BUCKETS,
  STORAGE_PROVIDER,
  type BucketKey,
  type StorageBucketsConfig,
  type StorageProvider,
} from "../storage/index.js";

const PRESIGNED_URL_TTL = 3600; // 1 hour

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    @Inject(STORAGE_BUCKETS)
    private readonly storageBuckets: StorageBucketsConfig,
  ) {}

  /**
   * Creates an upload intent: validates bucket constraints, creates a pending
   * file record, and returns a presigned PUT URL.
   */
  async createUploadIntent(
    bucketKey: BucketKey,
    filename: string,
    mimetype: string,
    sizeInBytes: number,
    uploadedBy?: number,
  ): Promise<{ fileId: number; uploadUrl: string; expiresAt: string }> {
    const bucketConfig = this.storageBuckets[bucketKey];
    if (!bucketConfig) {
      throw new BadRequestException(`Unknown bucket key: ${bucketKey}`);
    }

    // Validate mimetype
    if (!bucketConfig.allowedMimetypes.includes(mimetype)) {
      throw new BadRequestException(
        `Mimetype "${mimetype}" is not allowed for bucket "${bucketKey}". Allowed: ${bucketConfig.allowedMimetypes.join(", ")}`,
      );
    }

    // Validate file size
    if (sizeInBytes > bucketConfig.maxFileSizeBytes) {
      throw new BadRequestException(
        `File size ${sizeInBytes} bytes exceeds maximum ${bucketConfig.maxFileSizeBytes} bytes for bucket "${bucketKey}"`,
      );
    }

    // Generate UUID-based path with original extension
    const ext = extname(filename);
    const path = `${uuidv4()}${ext}`;

    // Create pending file record
    const newFile: NewFileRecord = {
      bucketName: bucketConfig.bucketName,
      path,
      filename,
      mimetype,
      sizeInBytes,
      isPublic: bucketConfig.isPublic,
      status: "pending",
      uploadedBy: uploadedBy ?? null,
    };

    const [fileRecord] = await this.db
      .insert(files)
      .values(newFile)
      .returning();

    // Generate presigned PUT URL
    const uploadUrl = await this.storageProvider.getPresignedPutUrl(
      bucketConfig.bucketName,
      path,
      mimetype,
      PRESIGNED_URL_TTL,
      bucketConfig.maxFileSizeBytes,
    );

    const expiresAt = new Date(
      Date.now() + PRESIGNED_URL_TTL * 1000,
    ).toISOString();

    return {
      fileId: fileRecord.id,
      uploadUrl,
      expiresAt,
    };
  }

  /**
   * Confirms that a file was uploaded to storage and marks it as ready.
   */
  async confirmUpload(fileId: number): Promise<FileRecord> {
    const file = await this.findActiveById(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.status === "ready") {
      return file;
    }

    if (file.status !== "pending") {
      throw new BadRequestException(
        `File ${fileId} has status "${file.status}" and cannot be confirmed`,
      );
    }

    // Verify the object exists in storage
    const objectExists = await this.storageProvider.exists(
      file.bucketName,
      file.path,
    );
    if (!objectExists) {
      await this.db
        .update(files)
        .set({ status: "failed" })
        .where(eq(files.id, fileId));
      throw new BadRequestException(
        `File ${fileId} was not found in storage. Status set to failed.`,
      );
    }

    const [updated] = await this.db
      .update(files)
      .set({ status: "ready" })
      .where(eq(files.id, fileId))
      .returning();

    return updated;
  }

  /**
   * Resolves a usable URL for a file. Public files get a direct URL,
   * private files get a presigned GET URL.
   */
  async resolveUrl(fileId: number): Promise<string> {
    const file = await this.findActiveById(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.status !== "ready") {
      throw new BadRequestException(
        `File ${fileId} is not ready (status: ${file.status})`,
      );
    }

    if (file.isPublic) {
      return this.storageProvider.getPublicUrl(file.bucketName, file.path);
    }

    return this.storageProvider.getPresignedGetUrl(
      file.bucketName,
      file.path,
      PRESIGNED_URL_TTL,
    );
  }

  /**
   * Asserts that a file exists and has status 'ready'.
   * Use this from other modules when attaching a file by ID.
   */
  async assertFileReady(fileId: number): Promise<FileRecord> {
    const file = await this.findActiveById(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (file.status !== "ready") {
      throw new BadRequestException(
        `File ${fileId} is not ready (status: ${file.status}). Only files with status "ready" can be attached.`,
      );
    }

    return file;
  }

  /**
   * Soft-deletes the DB row and removes the object from storage.
   */
  async softDelete(fileId: number): Promise<void> {
    const file = await this.findActiveById(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Delete from storage
    try {
      await this.storageProvider.delete(file.bucketName, file.path);
    } catch (error) {
      this.logger.warn(
        `Failed to delete object ${file.path} from bucket ${file.bucketName}: ${error}`,
      );
    }

    // Soft-delete the DB row
    await this.db
      .update(files)
      .set({ deletedAt: new Date() })
      .where(eq(files.id, fileId));
  }

  /**
   * Finds a file by ID excluding soft-deleted records.
   */
  private async findActiveById(
    fileId: number,
  ): Promise<FileRecord | undefined> {
    const result = await this.db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), isNull(files.deletedAt)))
      .limit(1);

    return result[0];
  }
}
