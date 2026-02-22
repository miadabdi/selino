import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Kavenegar from "kavenegar";
import { SmsProvider, type SmsSendResult } from "./sms-provider.abstract.js";

/**
 * Kavenegar SMS provider.
 * Sends SMS messages via the Kavenegar gateway.
 *
 * Required env vars:
 *  - KAVENEGAR_API_KEY
 *  - KAVENEGAR_SENDER
 */
@Injectable()
export class KavenegarSmsProvider extends SmsProvider {
  private readonly logger = new Logger(KavenegarSmsProvider.name);
  private readonly api: Kavenegar.kavenegar.KavenegarInstance;
  private readonly sender: string;

  constructor(private readonly configService: ConfigService) {
    super();
    // kavenegar is a CommonJS package

    // const Kavenegar = require("kavenegar");
    this.api = Kavenegar.KavenegarApi({
      apikey: this.configService.getOrThrow<string>("KAVENEGAR_API_KEY"),
    });
    this.sender = this.configService.getOrThrow<string>("KAVENEGAR_SENDER");
  }

  async send(phone: string, message: string): Promise<SmsSendResult> {
    return new Promise<SmsSendResult>((resolve) => {
      this.api.Send(
        { message, sender: this.sender, receptor: phone },
        (response: any, status: number, message: string) => {
          if (status === 200) {
            const messageId = response?.[0]?.messageid?.toString();
            this.logger.log(`SMS sent to ${phone} (messageId: ${messageId})`);
            resolve({ success: true, messageId });
          } else {
            this.logger.error(
              `SMS to ${phone} failed (status ${status}): message: ${message}`,
            );
            resolve({ success: false, error: message });
          }
        },
      );
    });
  }
}
