export interface StorageProvider {
  /**
   * Upload a buffer directly to storage.
   */
  upload(
    bucket: string,
    key: string,
    body: Buffer,
    mimetype: string,
  ): Promise<void>;

  getPresignedPutUrl(
    bucket: string,
    key: string,
    mimetype: string,
    expiresIn?: number,
    maxFileSizeBytes?: number,
  ): Promise<string>;

  getPresignedGetUrl(
    bucket: string,
    key: string,
    expiresIn?: number,
  ): Promise<string>;

  getPublicUrl(bucket: string, key: string): string;

  delete(bucket: string, key: string): Promise<void>;

  exists(bucket: string, key: string): Promise<boolean>;

  ensureBucketExists(bucket: string): Promise<void>;

  setBucketPublicRead(bucket: string): Promise<void>;
}
