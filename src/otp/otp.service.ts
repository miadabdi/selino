import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt } from "drizzle-orm";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import { authOtps } from "../database/schema/index.js";
import { SmsProvider } from "../sms/sms-provider.abstract.js";

@Injectable()
export class OtpService {
  /** OTP validity duration in minutes */
  private readonly OTP_TTL_MINUTES = 5;

  /** OTP code length */
  private readonly OTP_LENGTH = 6;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly smsProvider: SmsProvider,
  ) {}

  /**
   * Generate a random numeric OTP code.
   */
  private generateCode(): string {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  }

  /**
   * Create and send a new OTP for the given phone number.
   */
  async sendOtp(phone: string, userId?: number): Promise<void> {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + this.OTP_TTL_MINUTES * 60 * 1000);

    await this.db.insert(authOtps).values({
      phone,
      code,
      expiresAt,
      userId: userId ?? null,
      consumed: false,
    });

    await this.smsProvider.send(
      phone,
      `Your Selino verification code is: ${code}`,
    );
  }

  /**
   * Verify an OTP code for the given phone number.
   * Returns true if valid, false otherwise. Marks OTP as consumed on success.
   */
  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const now = new Date();

    const result = await this.db
      .select()
      .from(authOtps)
      .where(
        and(
          eq(authOtps.phone, phone),
          eq(authOtps.code, code),
          eq(authOtps.consumed, false),
          gt(authOtps.expiresAt, now),
        ),
      )
      .limit(1);

    const otp = result[0];
    if (!otp) return false;

    // Mark OTP as consumed
    await this.db
      .update(authOtps)
      .set({ consumed: true })
      .where(eq(authOtps.id, otp.id));

    return true;
  }
}
