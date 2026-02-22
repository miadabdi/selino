import { Global, Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module";
import {
  ProfilePictureUploadInterceptor,
  UsersController,
} from "./users.controller";
import { UsersRepository } from "./users.repository";
import { UsersService } from "./users.service";

@Global()
@Module({
  imports: [FilesModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, ProfilePictureUploadInterceptor],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
