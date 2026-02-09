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
import { AuthService } from "./auth.service.js";
import { SendOtpDto, VerifyOtpDto } from "./dto/index.js";
import { GoogleAuthGuard } from "./guards/google-auth.guard.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/otp/send
   * Send an OTP code to the given phone number.
   */
  @Post("otp/send")
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    await this.authService.sendPhoneOtp(dto.phone);
    return { message: "OTP sent successfully" };
  }

  /**
   * POST /auth/otp/verify
   * Verify OTP and return JWT tokens.
   */
  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyPhoneOtp(dto.phone, dto.code);
  }

  /**
   * GET /auth/google
   * Initiate Google OAuth2 login flow.
   */
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Guard redirects to Google
  }

  /**
   * GET /auth/google/callback
   * Handle Google OAuth2 callback.
   */
  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request) {
    const googleUser = req.user as {
      email?: string;
      firstName?: string;
      lastName?: string;
    };
    return this.authService.handleGoogleLogin(googleUser);
  }

  /**
   * GET /auth/me
   * Return the current authenticated user's info.
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
