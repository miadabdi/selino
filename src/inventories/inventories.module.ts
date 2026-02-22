import { Module } from "@nestjs/common";
import { InventoriesController } from "./inventories.controller.js";
import { InventoriesRepository } from "./inventories.repository.js";
import { InventoriesService } from "./inventories.service.js";
import { StoreInventoryTransactionsRepository } from "./store-inventory-transactions.repository.js";
import { StoreInventoryTransactionsService } from "./store-inventory-transactions.service.js";

@Module({
  imports: [],
  controllers: [InventoriesController],
  providers: [
    InventoriesService,
    InventoriesRepository,
    StoreInventoryTransactionsService,
    StoreInventoryTransactionsRepository,
  ],
  exports: [
    InventoriesService,
    InventoriesRepository,
    StoreInventoryTransactionsService,
    StoreInventoryTransactionsRepository,
  ],
})
export class InventoriesModule {}
