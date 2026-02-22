import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TXContext } from "../database/database.types";
import { NotificationChannel } from "../notification/notification.enums";
import { NotificationService } from "../notification/notification.service";
import { OtpRepository } from "./otp.repository";

@Injectable()
export class OtpService {
  /** OTP validity duration in minutes. */
  private readonly otpTtlMinutes: number;

  /** OTP code length. */
  private readonly otpLength: number;

  constructor(
    private readonly otpRepository: OtpRepository,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {
    this.otpTtlMinutes =
      this.configService.getOrThrow<number>("OTP_TTL_MINUTES");
    this.otpLength = this.configService.getOrThrow<number>("OTP_LENGTH");
  }

  /**
   * Generate a random numeric OTP code.
   */
  private generateCode(): string {
    const min = Math.pow(10, this.otpLength - 1);
    const max = Math.pow(10, this.otpLength) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  }

  /**
   * Create and send a new OTP for the given phone number.
   */
  async sendOtp(
    phone: string,
    userId?: number,
    txContext: TXContext = this.otpRepository.db,
  ): Promise<void> {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + this.otpTtlMinutes * 60 * 1000);

    await this.otpRepository.createPhoneOtp(
      phone,
      code,
      expiresAt,
      userId,
      txContext,
    );

    await this.notificationService.send(
      {
        channel: NotificationChannel.SMS,
        destination: phone,
        type: "otp",
        body: `Your Selino verification code is: ${code}`,
        userId: userId ?? undefined,
        metadata: { code },
      },
      txContext,
    );
  }

  /**
   * Create and send a new OTP for the given email address.
   */
  async sendEmailOtp(
    email: string,
    userId?: number,
    txContext: TXContext = this.otpRepository.db,
  ): Promise<void> {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + this.otpTtlMinutes * 60 * 1000);

    await this.otpRepository.createEmailOtp(
      email,
      code,
      expiresAt,
      userId,
      txContext,
    );

    await this.notificationService.send(
      {
        channel: NotificationChannel.EMAIL,
        destination: email,
        type: "otp",
        title: "Email Verification Code",
        body: `Your Selino verification code is: ${code}`,
        userId: userId ?? undefined,
        metadata: { code },
      },
      txContext,
    );
  }

  /**
   * Verify an OTP code for the given phone number.
   * Returns true if valid, false otherwise. Marks OTP as consumed on success.
   */
  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const now = new Date();

    const otp = await this.otpRepository.findValidPhoneOtp(phone, code, now);
    if (!otp) return false;

    // Mark OTP as consumed
    await this.otpRepository.markConsumed(otp.id);

    return true;
  }

  /**
   * Verify an OTP code for the given email address.
   * Returns true if valid, false otherwise. Marks OTP as consumed on success.
   */
  async verifyEmailOtp(email: string, code: string): Promise<boolean> {
    const now = new Date();

    const otp = await this.otpRepository.findValidEmailOtp(email, code, now);
    if (!otp) return false;

    // Mark OTP as consumed
    await this.otpRepository.markConsumed(otp.id);

    return true;
  }
}
