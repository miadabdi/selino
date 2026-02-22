import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TXContext } from "../database/database.types";
import type { User } from "../database/schema/index";
import { OtpService } from "../otp/otp.service";
import { UsersRepository } from "../users/users.repository";
import type { JwtPayload } from "./interfaces/jwt-payload.interface";
import { RefreshTokenService } from "./refresh-token.service";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Step 1 of phone auth: send an OTP to the phone number.
   * Creates the user if they don't exist yet.
   */
  async sendPhoneOtp(
    phone: string,
    userId?: number,
    tx?: TXContext,
  ): Promise<void> {
    if (!userId) {
      const user = await this.usersRepository.findByPhone(phone);
      userId = user?.id;
    }
    await this.otpService.sendOtp(phone, userId, tx);
  }

  /**
   * Send an OTP to the email address for verification.
   */
  async sendEmailOtp(
    email: string,
    userId?: number,
    tx?: TXContext,
  ): Promise<void> {
    if (!userId) {
      const user = await this.usersRepository.findByEmail(email);
      userId = user?.id;
    }
    await this.otpService.sendEmailOtp(email, userId, tx);
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

    const existingUser = await this.usersRepository.findByPhone(phone);

    if (!existingUser) {
      const user = await this.usersRepository.transaction(async (tx) => {
        const created = await this.usersRepository.create({ phone }, tx);
        await this.usersRepository.markPhoneVerified(created.id, tx);
        await this.usersRepository.updateLastLogin(created.id, tx);

        return created;
      });
      return this.generateTokens(user);
    }

    if (!existingUser.isPhoneVerified) {
      await this.usersRepository.transaction(async (tx) => {
        await this.usersRepository.markPhoneVerified(existingUser.id, tx);
        await this.usersRepository.updateLastLogin(existingUser.id, tx);
      });
    } else {
      await this.usersRepository.updateLastLogin(existingUser.id);
    }

    return this.generateTokens(existingUser);
  }

  /**
   * Verify email OTP and mark the email as verified for the user.
   */
  async verifyEmailOtp(email: string, code: string): Promise<void> {
    const isValid = await this.otpService.verifyEmailOtp(email, code);
    if (!isValid) {
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    // Find the user by email and mark as verified
    const user = await this.usersRepository.findByEmail(email);
    if (user) {
      await this.usersRepository.markEmailVerified(user.id);
    }
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

    const existing = await this.usersRepository.findByEmail(googleUser.email);
    if (existing) {
      await this.usersRepository.updateLastLogin(existing.id);
      return this.generateTokens(existing);
    }

    const user = await this.usersRepository.transaction(async (tx) => {
      const created = await this.usersRepository.create(
        {
          email: googleUser.email,
          firstName: googleUser.firstName ?? null,
          lastName: googleUser.lastName ?? null,
          phone: "",
          isEmailVerified: true,
        },
        tx,
      );

      await this.usersRepository.updateLastLogin(created.id, tx);

      return created;
    });

    return this.generateTokens(user);
  }

  /**
   * Rotate a refresh token and return new access + refresh tokens.
   */
  async refreshTokens(rawRefreshToken: string): Promise<AuthTokens> {
    const { newRawToken, tokenRecord } =
      await this.refreshTokenService.rotate(rawRefreshToken);

    const user = await this.usersRepository.findById(tokenRecord.userId);
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
