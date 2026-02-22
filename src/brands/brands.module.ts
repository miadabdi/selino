import { Module } from "@nestjs/common";
import { BrandsController } from "./brands.controller";
import { BrandsRepository } from "./brands.repository";
import { BrandsService } from "./brands.service";

@Module({
  imports: [],
  controllers: [BrandsController],
  providers: [BrandsService, BrandsRepository],
  exports: [BrandsService, BrandsRepository],
})
export class BrandsModule {}
