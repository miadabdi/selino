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
import type { Request } from "express";
import type { User } from "../database/schema/index";
import { AuthService } from "./auth.service";
import { GetUser } from "./decorators/index";
import {
  RefreshTokenDto,
  SendEmailOtpDto,
  SendOtpDto,
  VerifyEmailOtpDto,
  VerifyOtpDto,
} from "./dto/index";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "./guards/user-enrichment.guard";
import { AuthTokensResponse, MessageResponse } from "./responses/index";
import * as Swagger from "./auth.swagger";

@Swagger.ControllerDocs()
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("otp/send")
  @HttpCode(HttpStatus.OK)
  @Swagger.SendPhoneOtp()
  async sendOtp(@Body() dto: SendOtpDto): Promise<MessageResponse> {
    await this.authService.sendPhoneOtp(dto.phone);
    return { message: "OTP sent successfully" };
  }

  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  @Swagger.VerifyPhoneOtp()
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthTokensResponse> {
    return this.authService.verifyPhoneOtp(dto.phone, dto.code);
  }

  @Post("email/send")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserEnrichmentGuard)
  @Swagger.SendEmailOtp()
  async sendEmailOtp(
    @GetUser() user: User,
    @Body() dto: SendEmailOtpDto,
  ): Promise<MessageResponse> {
    await this.authService.sendEmailOtp(dto.email, user.id);
    return { message: "OTP sent successfully" };
  }

  @Post("email/verify")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserEnrichmentGuard)
  @Swagger.VerifyEmailOtp()
  async verifyEmailOtp(
    @GetUser() user: User,
    @Body() dto: VerifyEmailOtpDto,
  ): Promise<MessageResponse> {
    await this.authService.verifyEmailOtp(dto.email, dto.code);
    return { message: "Email verified successfully" };
  }

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  @Swagger.StartGoogleLogin()
  googleLogin() {
    // Guard redirects to Google
  }

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  @Swagger.HideGoogleCallback()
  async googleCallback(@Req() req: Request): Promise<AuthTokensResponse> {
    const googleUser = req.user as {
      email?: string;
      firstName?: string;
      lastName?: string;
    };
    return this.authService.handleGoogleLogin(googleUser);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Swagger.RefreshSession()
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    return await this.authService.refreshTokens(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @Swagger.Logout()
  async logout(@Body() dto: RefreshTokenDto): Promise<MessageResponse> {
    await this.authService.logout(dto.refreshToken);
    return { message: "Logged out successfully" };
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Swagger.LogoutAll()
  async logoutAll(@Req() req: Request): Promise<MessageResponse> {
    const user = req.user as { id: number };
    await this.authService.logoutAll(user.id);
    return { message: "All sessions revoked" };
  }
}
