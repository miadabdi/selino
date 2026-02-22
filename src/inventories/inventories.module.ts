import { Module } from "@nestjs/common";
import { InventoriesController } from "./inventories.controller.js";
import { InventoriesService } from "./inventories.service.js";

@Module({
  imports: [],
  controllers: [InventoriesController],
  providers: [InventoriesService],
  exports: [InventoriesService],
})
export class InventoriesModule {}
