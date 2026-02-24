import { Module } from "@nestjs/common";
import { InventoriesModule } from "../inventories/inventories.module";
import { PurchaseRequestsController } from "./purchase-requests.controller";
import { PurchaseRequestsRepository } from "./purchase-requests.repository";
import { PurchaseRequestsService } from "./purchase-requests.service";

@Module({
  imports: [InventoriesModule],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService, PurchaseRequestsRepository],
  exports: [PurchaseRequestsService, PurchaseRequestsRepository],
})
export class PurchaseRequestsModule {}
