export interface BucketConfig {
  bucketName: string;
  isPublic: boolean;
  maxFileSizeBytes: number;
  allowedMimetypes: string[];
}

export interface PresignedPutOptions {
  bucket: string;
  key: string;
  mimetype: string;
  maxFileSizeBytes: number;
  expiresIn?: number;
}
