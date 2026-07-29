import {
  Body,
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  NestInterceptor,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { GetUser } from "../auth/decorators/index";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { imageFileFilter } from "../files/index";
import { UpdateUserDto, UserBase } from "./dto/index";
import { UsersService } from "./users.service";
import * as Swagger from "./users.swagger";

@Injectable()
export class ProfilePictureUploadInterceptor implements NestInterceptor {
  private readonly interceptor: NestInterceptor;

  constructor(private readonly configService: ConfigService) {
    const maxProfileImageBytes = this.configService.getOrThrow<number>(
      "UPLOAD_MAX_PROFILE_IMAGE_BYTES",
    );
    const MixinInterceptor = FileInterceptor("profilePicture", {
      limits: { fileSize: maxProfileImageBytes },
      fileFilter: imageFileFilter,
    });
    this.interceptor = new MixinInterceptor();
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    return this.interceptor.intercept(context, next);
  }
}

@Swagger.ControllerDocs()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put("me")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserEnrichmentGuard)
  @UseInterceptors(ProfilePictureUploadInterceptor)
  @Swagger.UpdateProfile()
  async updateProfile(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ): Promise<UserBase> {
    return await this.usersService.update(user.id, dto, profilePicture);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard, UserEnrichmentGuard)
  @Swagger.GetProfile()
  getProfile(@GetUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
