import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { extname } from "path";
import { v4 as uuidv4 } from "uuid";
import { TXContext } from "../database/database.types";
import { type FileRecord, type NewFileRecord } from "../database/schema/index";
import {
  STORAGE_BUCKETS,
  STORAGE_PROVIDER,
  type BucketKey,
  type StorageBucketsConfig,
  type StorageProvider,
} from "../storage/index";
import { FilesRepository } from "./files.repository";

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly presignedUrlTtlSeconds: number;

  constructor(
    private readonly filesRepository: FilesRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    @Inject(STORAGE_BUCKETS)
    private readonly storageBuckets: StorageBucketsConfig,
    private readonly configService: ConfigService,
  ) {
    this.presignedUrlTtlSeconds = this.configService.getOrThrow<number>(
      "FILES_PRESIGNED_URL_TTL_SECONDS",
    );
  }

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

    // Generate presigned PUT URL
    const uploadUrl = await this.storageProvider.getPresignedPutUrl(
      bucketConfig.bucketName,
      path,
      mimetype,
      this.presignedUrlTtlSeconds,
      bucketConfig.maxFileSizeBytes,
    );

    const fileRecord = await this.filesRepository.create(newFile);

    const expiresAt = new Date(
      Date.now() + this.presignedUrlTtlSeconds * 1000,
    ).toISOString();

    return {
      fileId: fileRecord.id,
      uploadUrl,
      expiresAt,
    };
  }

  /**
   * Uploads a buffer directly to storage and creates a ready file record.
   * Use this when the server processes a file (e.g. image resizing) before
   * storing it, bypassing the presigned-URL flow.
   */
  async uploadFromBuffer(
    bucketKey: BucketKey,
    buffer: Buffer,
    filename: string,
    mimetype: string,
    uploadedBy?: number,
  ): Promise<FileRecord> {
    const bucketConfig = this.storageBuckets[bucketKey];
    if (!bucketConfig) {
      throw new BadRequestException(`Unknown bucket key: ${bucketKey}`);
    }

    if (!bucketConfig.allowedMimetypes.includes(mimetype)) {
      throw new BadRequestException(
        `Mimetype "${mimetype}" is not allowed for bucket "${bucketKey}". Allowed: ${bucketConfig.allowedMimetypes.join(", ")}`,
      );
    }

    if (buffer.length > bucketConfig.maxFileSizeBytes) {
      throw new BadRequestException(
        `File size ${buffer.length} bytes exceeds maximum ${bucketConfig.maxFileSizeBytes} bytes for bucket "${bucketKey}"`,
      );
    }

    const ext = extname(filename);
    const path = `${uuidv4()}${ext}`;

    // Upload to storage
    await this.storageProvider.upload(
      bucketConfig.bucketName,
      path,
      buffer,
      mimetype,
    );

    // Create file record as ready
    const newFile: NewFileRecord = {
      bucketName: bucketConfig.bucketName,
      path,
      filename,
      mimetype,
      sizeInBytes: buffer.length,
      isPublic: bucketConfig.isPublic,
      status: "ready",
      uploadedBy: uploadedBy ?? null,
    };

    const fileRecord = await this.filesRepository.create(newFile);

    return fileRecord;
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
      await this.filesRepository.markStatus(fileId, "failed");
      throw new BadRequestException(
        `File ${fileId} was not found in storage. Status set to failed.`,
      );
    }

    return this.filesRepository.markStatus(fileId, "ready");
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
      this.presignedUrlTtlSeconds,
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
  async softDelete(fileId: number, tx?: TXContext): Promise<void> {
    const file = await this.findActiveById(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Delete from storage
    try {
      await this.storageProvider.delete(file.bucketName, file.path);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to delete object ${file.path} from bucket ${file.bucketName}: ${message}`,
      );
    }

    // Soft-delete the DB row
    await this.filesRepository.softDeleteById(fileId, tx);
  }

  /**
   * Finds a file by ID excluding soft-deleted records.
   */
  private async findActiveById(
    fileId: number,
  ): Promise<FileRecord | undefined> {
    return this.filesRepository.findActiveById(fileId);
  }
}
