import { Injectable } from "@nestjs/common";
import {
  NotificationChannelHandler,
  type ChannelSendResult,
} from "../interfaces/notification-channel.interface.js";
import { SmsProvider } from "../providers/sms/sms-provider.abstract.js";

/**
 * SMS channel handler.
 * Delegates to the configured SmsProvider implementation (Kavenegar, SMS.ir, Console, etc.).
 * Uses sendVerifyCode for OTP notifications when supported by the provider.
 */
@Injectable()
export class SmsChannelHandler extends NotificationChannelHandler {
  constructor(private readonly smsProvider: SmsProvider) {
    super();
  }

  async send(
    destination: string,
    body: string,
    _title?: string,
    type?: string,
    metadata?: Record<string, unknown>,
  ): Promise<ChannelSendResult> {
    if (type === "otp" && typeof metadata?.code === "string") {
      return this.smsProvider.sendVerifyCode(destination, metadata.code);
    }
    return this.smsProvider.send(destination, body);
  }
}
