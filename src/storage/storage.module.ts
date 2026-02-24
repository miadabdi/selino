import {
  Global,
  Inject,
  Logger,
  Module,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { StorageProvider } from "./interfaces/index";
import { S3StorageProvider } from "./providers/s3-storage.provider";
import {
  createStorageBucketsConfig,
  type StorageBucketsConfig,
} from "./storage.config";
import { STORAGE_BUCKETS, STORAGE_PROVIDER } from "./storage.constants";

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: (configService: ConfigService): StorageProvider => {
        return new S3StorageProvider(
          configService.get<string>("STORAGE_ENDPOINT"),
          configService.getOrThrow<string>("STORAGE_REGION"),
          configService.getOrThrow<string>("STORAGE_ACCESS_KEY_ID"),
          configService.getOrThrow<string>("STORAGE_SECRET_ACCESS_KEY"),
          configService.getOrThrow<boolean>("STORAGE_FORCE_PATH_STYLE"),
          configService.get<string>("STORAGE_PUBLIC_URL_BASE", ""),
        );
      },
      inject: [ConfigService],
    },
    {
      provide: STORAGE_BUCKETS,
      useFactory: (configService: ConfigService): StorageBucketsConfig => {
        return createStorageBucketsConfig(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_PROVIDER, STORAGE_BUCKETS],
})
export class StorageModule implements OnModuleInit {
  private readonly logger = new Logger(StorageModule.name);

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    @Inject(STORAGE_BUCKETS)
    private readonly buckets: StorageBucketsConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log("Ensuring all configured storage buckets exist...");

    for (const [key, config] of Object.entries(this.buckets)) {
      try {
        await this.storageProvider.ensureBucketExists(config.bucketName);

        if (config.isPublic) {
          await this.storageProvider.setBucketPublicRead(config.bucketName);
        }

        this.logger.log(`Bucket "${config.bucketName}" (${key}) is ready`);
      } catch (error) {
        this.logger.error(
          `Failed to ensure bucket "${config.bucketName}" (${key}): ${error}`,
        );
        throw error;
      }
    }

    this.logger.log("All storage buckets verified");
  }
}
