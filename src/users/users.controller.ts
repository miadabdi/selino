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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { GetUser } from "../auth/decorators/index";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { imageFileFilter } from "../files/index";
import {
  GetMeResponse,
  UpdateProfileBody,
  UpdateUserDto,
  UserBase,
} from "./dto/index";
import { UsersService } from "./users.service";

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

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * PUT /users/me
   * Update the current user's profile information.
   * Accepts an optional profile picture as a multipart file upload.
   */
  @Put("me")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserEnrichmentGuard)
  @ApiBearerAuth()
  @UseInterceptors(ProfilePictureUploadInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Update current user's profile" })
  @ApiBody({ type: UpdateProfileBody })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "User updated successfully, email verification sent if email changed",
    type: UserBase,
  })
  @ApiUnauthorizedResponse({ description: "Not authenticated" })
  async updateProfile(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ): Promise<UserBase> {
    return await this.usersService.update(user.id, dto, profilePicture);
  }

  /**
   * GET /users/me
   * Return the current authenticated user's info.
   */
  @Get("me")
  @UseGuards(JwtAuthGuard, UserEnrichmentGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Current authenticated user info",
    type: GetMeResponse,
  })
  @ApiUnauthorizedResponse({ description: "Not authenticated" })
  getProfile(@GetUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
