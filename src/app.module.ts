import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AuthModule } from "./auth/auth.module.js";
import { BrandsModule } from "./brands/brands.module.js";
import { CategoriesModule } from "./categories/categories.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { FilesModule } from "./files/files.module.js";
import { InventoriesModule } from "./inventories/inventories.module.js";
import { ProductsModule } from "./products/products.module.js";
import { PurchaseRequestsModule } from "./purchase-requests/purchase-requests.module.js";
import { RabbitmqModule } from "./rabbitmq/rabbitmq.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { StoresModule } from "./stores/stores.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
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
