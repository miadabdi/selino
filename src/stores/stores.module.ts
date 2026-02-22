import { Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module.js";
import {
  StoreLogoUploadInterceptor,
  StoresController,
} from "./stores.controller.js";
import { StoresRepository } from "./stores.repository.js";
import { StoresService } from "./stores.service.js";

@Module({
  imports: [FilesModule],
  controllers: [StoresController],
  providers: [StoresService, StoresRepository, StoreLogoUploadInterceptor],
  exports: [StoresService, StoresRepository],
})
export class StoresModule {}
