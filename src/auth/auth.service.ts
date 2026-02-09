import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { User } from "../database/schema/index.js";
import { OtpService } from "../otp/otp.service.js";
import { UsersService } from "../users/users.service.js";
import type { JwtPayload } from "./interfaces/jwt-payload.interface.js";
import { RefreshTokenService } from "./refresh-token.service.js";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Step 1 of phone auth: send an OTP to the phone number.
   * Creates the user if they don't exist yet.
   */
  async sendPhoneOtp(phone: string): Promise<void> {
    const user = await this.usersService.findByPhone(phone);
    await this.otpService.sendOtp(phone, user?.id);
  }

  /**
   * Step 2 of phone auth: verify OTP and return JWT tokens.
   * Creates a new user if one doesn't exist for this phone.
   */
  async verifyPhoneOtp(phone: string, code: string): Promise<AuthTokens> {
    const isValid = await this.otpService.verifyOtp(phone, code);
    if (!isValid) {
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    // Find or create user
    let user = await this.usersService.findByPhone(phone);
    if (!user) {
      user = await this.usersService.create({ phone });
    }

    // Mark phone as verified and update last login
    await this.usersService.markPhoneVerified(user.id);
    await this.usersService.updateLastLogin(user.id);

    return this.generateTokens(user);
  }

  /**
   * Handle Google OAuth callback.
   * Finds or creates a user from Google profile data, then returns tokens.
   */
  async handleGoogleLogin(googleUser: {
    email?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthTokens> {
    if (!googleUser.email) {
      throw new UnauthorizedException(
        "Google account must have an email address",
      );
    }

    const user = await this.usersService.findOrCreateByEmail({
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
    });

    await this.usersService.updateLastLogin(user.id);

    return this.generateTokens(user);
  }

  /**
   * Rotate a refresh token and return new access + refresh tokens.
   */
  async refreshTokens(rawRefreshToken: string): Promise<AuthTokens> {
    const { newRawToken, tokenRecord } =
      await this.refreshTokenService.rotate(rawRefreshToken);

    const user = await this.usersService.findById(tokenRecord.userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      email: user.email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: newRawToken,
    };
  }

  /**
   * Revoke a refresh token (logout).
   */
  async logout(rawRefreshToken: string): Promise<void> {
    await this.refreshTokenService.revoke(rawRefreshToken, "logout");
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices).
   */
  async logoutAll(userId: number): Promise<void> {
    await this.refreshTokenService.revokeAllForUser(userId, "logout_all");
  }

  /**
   * Generate JWT access token and refresh token for a user.
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      email: user.email,
    };

    const refreshToken = await this.refreshTokenService.create(user.id);

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
    };
  }
}
