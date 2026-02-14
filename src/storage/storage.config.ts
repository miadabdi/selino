import type { ConfigService } from "@nestjs/config";
import type { BucketConfig } from "./interfaces/index.js";

/**
 * Static bucket keys — these never change at runtime and are safe to use
 * at module-parse time for DTO validation, type narrowing, etc.
 */
export const BUCKET_KEYS = ["productMedia", "profileMedia"] as const;
export type BucketKey = (typeof BUCKET_KEYS)[number];

export type StorageBucketsConfig = Record<BucketKey, BucketConfig>;

/**
 * Builds the bucket configuration map from ConfigService.
 * Must be called inside a NestJS factory (not at module-parse time)
 * so that .env values are available.
 */
export function createStorageBucketsConfig(
  configService: ConfigService,
): StorageBucketsConfig {
  return {
    productMedia: {
      bucketName: configService.getOrThrow<string>(
        "STORAGE_BUCKET_PRODUCT_MEDIA",
      ),
      isPublic: true,
      maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
      allowedMimetypes: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
    },
    profileMedia: {
      bucketName: configService.getOrThrow<string>(
        "STORAGE_BUCKET_PROFILE_MEDIA",
      ),
      isPublic: false,
      maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB
      allowedMimetypes: ["image/jpeg", "image/png", "image/webp"],
    },
  };
}
