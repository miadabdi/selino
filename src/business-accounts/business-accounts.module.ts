import { Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module";
import {
  BusinessAccountLogoUploadInterceptor,
  BusinessAccountsController,
} from "./business-accounts.controller";
import { BusinessAccountsRepository } from "./business-accounts.repository";
import { BusinessAccountsService } from "./business-accounts.service";

@Module({
  imports: [FilesModule],
  controllers: [BusinessAccountsController],
  providers: [
    BusinessAccountsService,
    BusinessAccountsRepository,
    BusinessAccountLogoUploadInterceptor,
  ],
  exports: [BusinessAccountsService, BusinessAccountsRepository],
})
export class BusinessAccountsModule {}
