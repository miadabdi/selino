import { Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module";
import {
  StoreLogoUploadInterceptor,
  StoresController,
} from "./stores.controller";
import { StoresRepository } from "./stores.repository";
import { StoresService } from "./stores.service";

@Module({
  imports: [FilesModule],
  controllers: [StoresController],
  providers: [StoresService, StoresRepository, StoreLogoUploadInterceptor],
  exports: [StoresService, StoresRepository],
})
export class StoresModule {}
