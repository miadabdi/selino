import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
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
import { GetUser } from "../auth/decorators/index.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { imageFileFilter } from "../files/index.js";
import { UpdateProfileBody, UpdateUserDto, UserResponse } from "./dto/index.js";
import { UsersService } from "./users.service.js";

/** Max raw upload size (10 MB) – sharp will compress it further. */
const MAX_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024;

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
  @UseInterceptors(
    FileInterceptor("profilePicture", {
      limits: { fileSize: MAX_PROFILE_IMAGE_BYTES },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Update current user's profile" })
  @ApiBody({ type: UpdateProfileBody })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "User updated successfully, email verification sent if email changed",
    type: UserResponse,
  })
  @ApiUnauthorizedResponse({ description: "Not authenticated" })
  async updateProfile(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ): Promise<UserResponse> {
    return await this.usersService.update(user.id, dto, profilePicture);
  }
}
