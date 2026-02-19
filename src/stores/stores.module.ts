import { Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module.js";
import { StoresController } from "./stores.controller.js";
import { StoresService } from "./stores.service.js";

@Module({
  imports: [FilesModule],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
