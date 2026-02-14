import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger } from "@nestjs/common";
import type { StorageProvider } from "../interfaces/index.js";

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client;
  private readonly publicUrlBase: string;
  private readonly forcePathStyle: boolean;

  constructor(
    endpoint: string | undefined,
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    forcePathStyle: boolean,
    publicUrlBase: string,
  ) {
    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    this.forcePathStyle = forcePathStyle;
    this.publicUrlBase = publicUrlBase.replace(/\/+$/, "");
  }

  async upload(
    bucket: string,
    key: string,
    body: Buffer,
    mimetype: string,
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: mimetype,
    });
    await this.client.send(command);
  }

  async getPresignedPutUrl(
    bucket: string,
    key: string,
    mimetype: string,
    expiresIn = 3600,
    maxFileSizeBytes?: number,
  ): Promise<string> {
    // TODO: S3 does not support enforcing max file size in presigned URLs. We should enforce this at the application level after upload, and delete the file if it exceeds the limit.
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimetype,
      //   ...(maxFileSizeBytes != null && {
      //     ContentLength: maxFileSizeBytes,
      //   }),
    });

    return getSignedUrl(this.client, command, {
      expiresIn,
      //   unhoistableHeaders: new Set(["content-length"]),
    });
  }

  async getPresignedGetUrl(
    bucket: string,
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  getPublicUrl(bucket: string, key: string): string {
    if (this.forcePathStyle) {
      // Path-style: https://host/bucket/key
      return `${this.publicUrlBase}/${bucket}/${key}`;
    }

    // Virtual-hosted style: https://bucket.host/key
    const url = new URL(this.publicUrlBase);
    url.hostname = `${bucket}.${url.hostname}`;
    return `${url.origin}/${key}`;
  }

  async delete(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async ensureBucketExists(bucket: string): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
      this.logger.log(`Bucket "${bucket}" already exists`);
    } catch {
      this.logger.log(`Bucket "${bucket}" not found, creating...`);
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
      this.logger.log(`Bucket "${bucket}" created successfully`);
    }
  }

  async setBucketPublicRead(bucket: string): Promise<void> {
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadGetObject",
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${bucket}/*`,
        },
      ],
    };

    await this.client.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify(policy),
      }),
    );
    this.logger.log(`Public-read policy applied to bucket "${bucket}"`);
  }
}
