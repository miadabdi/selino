import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Smsir } from "smsir-js";
import { SmsProvider, type SmsSendResult } from "./sms-provider.abstract.js";

/**
 * SMS.ir SMS provider.
 * Sends SMS messages via the SMS.ir gateway using the smsir-js package.
 *
 * Required env vars:
 *  - SMSIR_API_KEY
 *  - SMSIR_LINE_NUMBER
 *
 * Optional env vars (for verify-code templates):
 *  - SMSIR_VERIFY_TEMPLATE_ID
 *  - SMSIR_VERIFY_CODE_PARAM  (template parameter name, defaults to "CODE")
 */
@Injectable()
export class SmsirSmsProvider extends SmsProvider {
  private readonly logger = new Logger(SmsirSmsProvider.name);
  private readonly smsir: Smsir;
  private readonly verifyTemplateId?: number;
  private readonly verifyCodeParam: string;

  constructor(private readonly configService: ConfigService) {
    super();
    const apiKey = this.configService.getOrThrow<string>("SMSIR_API_KEY");
    const lineNumber = Number(
      this.configService.getOrThrow<string>("SMSIR_LINE_NUMBER"),
    );
    this.smsir = new Smsir(apiKey, lineNumber);

    const templateId = this.configService.get<string>(
      "SMSIR_VERIFY_TEMPLATE_ID",
    );
    this.verifyTemplateId = templateId ? Number(templateId) : undefined;
    this.verifyCodeParam = this.configService.get<string>(
      "SMSIR_VERIFY_CODE_PARAM",
      "CODE",
    );
  }

  async send(phone: string, message: string): Promise<SmsSendResult> {
    try {
      const response = await this.smsir.SendBulk(message, [phone]);
      this.logger.log(`SMS sent to ${phone} via SMS.ir`);
      return {
        success: true,
        messageId: response?.data?.packId?.toString(),
      };
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message
        ? error?.response?.data?.message
        : (error?.message ?? error?.toString() ?? "Unknown error");
      this.logger.error(`SMS to ${phone} failed via SMS.ir: ${errorMessage}`);
      console.error(error);
      return { success: false, error: errorMessage };
    }
  }

  override async sendVerifyCode(
    phone: string,
    code: string,
  ): Promise<SmsSendResult> {
    if (!this.verifyTemplateId) {
      this.logger.warn(
        "SMSIR_VERIFY_TEMPLATE_ID not set, falling back to plain SMS",
      );
      return super.sendVerifyCode(phone, code);
    }

    try {
      const response = await this.smsir.SendVerifyCode(
        phone,
        this.verifyTemplateId,
        [{ name: this.verifyCodeParam, value: code }],
      );
      this.logger.log(
        `Verify code sent to ${phone} via SMS.ir (template: ${this.verifyTemplateId})`,
      );
      return {
        success: true,
        messageId: response?.data?.messageId?.toString(),
      };
    } catch (error: any) {
      const errorMessage =
        error?.message ?? error?.toString() ?? "Unknown error";
      this.logger.error(
        `Verify code to ${phone} failed via SMS.ir: ${errorMessage}`,
      );
      return { success: false, error: errorMessage };
    }
  }
}
