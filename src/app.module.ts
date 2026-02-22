import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { BrandsModule } from "./brands/brands.module";
import { CategoriesModule } from "./categories/categories.module";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { FilesModule } from "./files/files.module";
import { InventoriesModule } from "./inventories/inventories.module";
import { ProductsModule } from "./products/products.module";
import { PurchaseRequestsModule } from "./purchase-requests/purchase-requests.module";
import { RabbitmqModule } from "./rabbitmq/rabbitmq.module";
import { StorageModule } from "./storage/storage.module";
import { StoresModule } from "./stores/stores.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validate: validateEnv,
    }),
    DatabaseModule,
    RabbitmqModule,
    StorageModule,
    AuthModule,
    UsersModule,
    FilesModule,
    StoresModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    InventoriesModule,
    PurchaseRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
