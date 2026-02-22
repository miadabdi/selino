import { Module } from "@nestjs/common";
import { InventoriesModule } from "../inventories/inventories.module.js";
import { PurchaseRequestsController } from "./purchase-requests.controller.js";
import { PurchaseRequestsRepository } from "./purchase-requests.repository.js";
import { PurchaseRequestsService } from "./purchase-requests.service.js";

@Module({
  imports: [InventoriesModule],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService, PurchaseRequestsRepository],
  exports: [PurchaseRequestsService, PurchaseRequestsRepository],
})
export class PurchaseRequestsModule {}
