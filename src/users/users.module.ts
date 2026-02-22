import { Global, Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module.js";
import {
  ProfilePictureUploadInterceptor,
  UsersController,
} from "./users.controller.js";
import { UsersRepository } from "./users.repository.js";
import { UsersService } from "./users.service.js";

@Global()
@Module({
  imports: [FilesModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, ProfilePictureUploadInterceptor],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
