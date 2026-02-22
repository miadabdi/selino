import { Module } from "@nestjs/common";
import { InventoriesController } from "./inventories.controller.js";
import { InventoriesService } from "./inventories.service.js";
import { StoreInventoryTransactionsService } from "./store-inventory-transactions.service.js";

@Module({
  imports: [],
  controllers: [InventoriesController],
  providers: [InventoriesService, StoreInventoryTransactionsService],
  exports: [InventoriesService, StoreInventoryTransactionsService],
})
export class InventoriesModule {}
