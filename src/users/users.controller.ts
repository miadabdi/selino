import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { GetUser } from "../auth/decorators/index.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard.js";
import { type User } from "../database/schema/index.js";
import { UpdateUserDto, UserResponse } from "./dto/index.js";
import { UsersService } from "./users.service.js";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * PUT /users/me
   * Update the current user's profile information
   */
  @Put("me")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserEnrichmentGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user's profile" })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "User updated successfully, email verification sent if email changed",
    type: UserResponse,
  })
  @ApiUnauthorizedResponse({ description: "Not authenticated" })
  async updateProfile(
    @GetUser() user: User,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponse> {
    return await this.usersService.update(user.id, dto);
  }
}
