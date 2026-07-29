import { Module } from "@nestjs/common";
import { InventoriesModule } from "../inventories/inventories.module";
import { NotificationModule } from "../notification/notification.module";
import { OrdersModule } from "../orders/orders.module";
import { TradeNetworkController } from "./trade-network.controller";
import { TradeNetworkRepository } from "./trade-network.repository";
import { TradeNetworkService } from "./trade-network.service";

@Module({
  imports: [InventoriesModule, NotificationModule, OrdersModule],
  controllers: [TradeNetworkController],
  providers: [TradeNetworkService, TradeNetworkRepository],
  exports: [TradeNetworkService, TradeNetworkRepository],
})
export class TradeNetworkModule {}
