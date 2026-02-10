import { Injectable, Logger } from "@nestjs/common";
import { SmsProvider, type SmsSendResult } from "./sms-provider.abstract.js";

/**
 * Console-based SMS provider for development / testing.
 * Logs the message to the console instead of sending a real SMS.
 */
@Injectable()
export class ConsoleSmsProvider extends SmsProvider {
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  send(phone: string, message: string): Promise<SmsSendResult> {
    this.logger.log(`[DEV SMS] To: ${phone} | Message: ${message}`);
    return Promise.resolve({
      success: true,
      messageId: `dev-${Date.now()}`,
    });
  }

  override sendVerifyCode(phone: string, code: string): Promise<SmsSendResult> {
    this.logger.log(`[DEV SMS Verify] To: ${phone} | Code: ${code}`);
    return Promise.resolve({
      success: true,
      messageId: `dev-verify-${Date.now()}`,
    });
  }
}
