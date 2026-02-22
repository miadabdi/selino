import { Module } from "@nestjs/common";
import { InventoriesController } from "./inventories.controller";
import { InventoriesRepository } from "./inventories.repository";
import { InventoriesService } from "./inventories.service";
import { StoreInventoryTransactionsRepository } from "./store-inventory-transactions.repository";
import { StoreInventoryTransactionsService } from "./store-inventory-transactions.service";

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
