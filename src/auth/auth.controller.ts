import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request } from "express";
import type { User } from "../database/schema/index.js";
import { UserResponse } from "../users/dto/index.js";
import { AuthService } from "./auth.service.js";
import { GetUser } from "./decorators/index.js";
import {
  RefreshTokenDto,
  SendEmailOtpDto,
  SendOtpDto,
  VerifyEmailOtpDto,
  VerifyOtpDto,
} from "./dto/index.js";
import { GoogleAuthGuard } from "./guards/google-auth.guard.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { UserEnrichmentGuard } from "./guards/user-enrichment.guard.js";
import { AuthTokensResponse, MessageResponse } from "./responses/index.js";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/otp/send
   * Send an OTP code to the given phone number.
   */
  @Post("otp/send")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send OTP to phone number" })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "OTP sent successfully",
    type: MessageResponse,
  })
  async sendOtp(@Body() dto: SendOtpDto): Promise<MessageResponse> {
    await this.authService.sendPhoneOtp(dto.phone);
    return { message: "OTP sent successfully" };
  }

  /**
   * POST /auth/otp/verify
   * Verify OTP and return JWT tokens.
   */
  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify OTP and get tokens" })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "OTP verified, returns access and refresh tokens",
    type: AuthTokensResponse,
  })
  @ApiUnauthorizedResponse({ description: "Invalid or expired OTP" })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthTokensResponse> {
    return this.authService.verifyPhoneOtp(dto.phone, dto.code);
  }

  /**
   * POST /auth/email/send
   * Send an OTP code to the given email address.
   */
  @Post("email/send")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserEnrichmentGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send OTP to email address" })
  @ApiBody({ type: SendEmailOtpDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "OTP sent successfully",
    type: MessageResponse,
  })
  @ApiUnauthorizedResponse({ description: "Not authenticated" })
  async sendEmailOtp(
    @GetUser() user: User,
    @Body() dto: SendEmailOtpDto,
  ): Promise<MessageResponse> {
    await this.authService.sendEmailOtp(dto.email, user.id);
    return { message: "OTP sent successfully" };
  }

  /**
   * POST /auth/email/verify
   * Verify email OTP and mark email as verified.
   */
  @Post("email/verify")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserEnrichmentGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify email OTP" })
  @ApiBody({ type: VerifyEmailOtpDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Email verified successfully",
    type: MessageResponse,
  })
  @ApiUnauthorizedResponse({ description: "Invalid or expired OTP" })
  async verifyEmailOtp(
    @GetUser() user: User,
    @Body() dto: VerifyEmailOtpDto,
  ): Promise<MessageResponse> {
    await this.authService.verifyEmailOtp(dto.email, dto.code);
    return { message: "Email verified successfully" };
  }

  /**
   * GET /auth/google
   * Initiate Google OAuth2 login flow.
   */
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: "Initiate Google OAuth2 login" })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: "Redirects to Google OAuth2 consent screen",
  })
  googleLogin() {
    // Guard redirects to Google
  }

  /**
   * GET /auth/google/callback
   * Handle Google OAuth2 callback.
   */
  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req: Request): Promise<AuthTokensResponse> {
    const googleUser = req.user as {
      email?: string;
      firstName?: string;
      lastName?: string;
    };
    return this.authService.handleGoogleLogin(googleUser);
  }

  /**
   * POST /auth/refresh
   * Rotate refresh token and return new access + refresh tokens.
   */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate refresh token" })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "New access and refresh tokens",
    type: AuthTokensResponse,
  })
  @ApiUnauthorizedResponse({ description: "Invalid or expired refresh token" })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    return await this.authService.refreshTokens(dto.refreshToken);
  }

  /**
   * POST /auth/logout
   * Revoke the provided refresh token.
   */
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout (revoke refresh token)" })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Refresh token revoked",
    type: MessageResponse,
  })
  @ApiUnauthorizedResponse({ description: "Invalid or expired refresh token" })
  async logout(@Body() dto: RefreshTokenDto): Promise<MessageResponse> {
    await this.authService.logout(dto.refreshToken);
    return { message: "Logged out successfully" };
  }

  /**
   * POST /auth/logout-all
   * Revoke all refresh tokens for the authenticated user.
   */
  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout from all devices" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "All refresh tokens revoked",
    type: MessageResponse,
  })
  @ApiUnauthorizedResponse({ description: "Not authenticated" })
  async logoutAll(@Req() req: Request): Promise<MessageResponse> {
    const user = req.user as { id: number };
    await this.authService.logoutAll(user.id);
    return { message: "All sessions revoked" };
  }

  /**
   * GET /auth/me
   * Return the current authenticated user's info.
   */
  @Get("me")
  @UseGuards(JwtAuthGuard, UserEnrichmentGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Current authenticated user info",
    type: UserResponse,
  })
  @ApiUnauthorizedResponse({ description: "Not authenticated" })
  getProfile(@GetUser() user: User): UserResponse {
    return user;
  }
}
