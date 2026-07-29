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
import { InvoicesModule } from "./invoices/invoices.module";
import { ProductsModule } from "./products/products.module";
import { PurchaseRequestsModule } from "./purchase-requests/purchase-requests.module";
import { RabbitmqModule } from "./rabbitmq/rabbitmq.module";
import { StorageModule } from "./storage/storage.module";
import { BusinessAccountsModule } from "./business-accounts/business-accounts.module";
import { TradeNetworkModule } from "./trade-network/trade-network.module";
import { UsersModule } from "./users/users.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { WalletsModule } from "./wallets/wallets.module";
import { PaymentsModule } from "./payments/payments.module";
import { OrdersModule } from "./orders/orders.module";
import { ShipmentsModule } from "./shipments/shipments.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { ReportsModule } from "./reports/reports.module";
import { SupportModule } from "./support/support.module";

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
    BusinessAccountsModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    InventoriesModule,
    InvoicesModule,
    PurchaseRequestsModule,
    TradeNetworkModule,
    DashboardModule,
    WalletsModule,
    PaymentsModule,
    OrdersModule,
    ShipmentsModule,
    SuppliersModule,
    ReportsModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
