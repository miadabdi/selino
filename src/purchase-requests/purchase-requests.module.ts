import { Module } from "@nestjs/common";
import { InventoriesModule } from "../inventories/inventories.module";
import { TradeNetworkModule } from "../trade-network/trade-network.module";
import { PurchaseRequestsController } from "./purchase-requests.controller";
import { PurchaseRequestsRepository } from "./purchase-requests.repository";
import { PurchaseRequestsService } from "./purchase-requests.service";

@Module({
  imports: [InventoriesModule, TradeNetworkModule],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService, PurchaseRequestsRepository],
  exports: [PurchaseRequestsService, PurchaseRequestsRepository],
})
export class PurchaseRequestsModule {}
