import { Injectable } from "@nestjs/common";
import {
  NotificationChannelHandler,
  type ChannelSendResult,
} from "../interfaces/notification-channel.interface.js";
import { SmsProvider } from "../providers/sms/sms-provider.abstract.js";

/**
 * SMS channel handler.
 * Delegates to the configured SmsProvider implementation (Kavenegar, Console, etc.).
 */
@Injectable()
export class SmsChannelHandler extends NotificationChannelHandler {
  constructor(private readonly smsProvider: SmsProvider) {
    super();
  }

  async send(destination: string, body: string): Promise<ChannelSendResult> {
    return this.smsProvider.send(destination, body);
  }
}
