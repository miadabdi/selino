import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { User } from "../database/schema/index.js";
import { OtpService } from "../otp/otp.service.js";
import { UsersService } from "../users/users.service.js";
import type { JwtPayload } from "./interfaces/jwt-payload.interface.js";

export interface AuthTokens {
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
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
   * Generate JWT access token for a user.
   */
  private generateTokens(user: User): AuthTokens {
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      email: user.email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
