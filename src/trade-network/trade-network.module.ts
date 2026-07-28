import { Module } from "@nestjs/common";
import { InventoriesModule } from "../inventories/inventories.module";
import { NotificationModule } from "../notification/notification.module";
import { TradeNetworkController } from "./trade-network.controller";
import { TradeNetworkRepository } from "./trade-network.repository";
import { TradeNetworkService } from "./trade-network.service";

@Module({
  imports: [InventoriesModule, NotificationModule],
  controllers: [TradeNetworkController],
  providers: [TradeNetworkService, TradeNetworkRepository],
  exports: [TradeNetworkService, TradeNetworkRepository],
})
export class TradeNetworkModule {}
