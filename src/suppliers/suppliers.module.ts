import { Module } from "@nestjs/common";
import { SuppliersController } from "./suppliers.controller.js";
import { SuppliersRepository } from "./suppliers.repository.js";
import { SuppliersService } from "./suppliers.service.js";

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, SuppliersRepository],
  exports: [SuppliersService, SuppliersRepository],
})
export class SuppliersModule {}
