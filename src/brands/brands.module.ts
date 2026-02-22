import { Module } from "@nestjs/common";
import { BrandsRepository } from "./brands.repository.js";
import { BrandsController } from "./brands.controller.js";
import { BrandsService } from "./brands.service.js";

@Module({
  imports: [],
  controllers: [BrandsController],
  providers: [BrandsService, BrandsRepository],
  exports: [BrandsService, BrandsRepository],
})
export class BrandsModule {}
