import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import {
  EmailProvider,
  type EmailSendResult,
} from "./email-provider.abstract.js";

/**
 * SMTP-based email provider.
 *
 * Required env vars:
 *  - SMTP_HOST
 *  - SMTP_PORT     (defaults to 2525)
 *  - SMTP_USERNAME
 *  - SMTP_PASSWORD
 *  - SMTP_FROM     (sender address)
 */
@Injectable()
export class SmtpEmailProvider extends EmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    super();

    const host = this.configService.get<string>("SMTP_HOST");
    this.from = this.configService.get<string>("SMTP_FROM", "");

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>("SMTP_PORT", 2525),
        auth: {
          user: this.configService.get<string>("SMTP_USERNAME", ""),
          pass: this.configService.get<string>("SMTP_PASSWORD", ""),
        },
      });
      this.logger.log(`SMTP email provider configured (host: ${host})`);
    } else {
      this.transporter = null;
      this.logger.warn(
        "SMTP_HOST not set – email sending is disabled. Set SMTP_* env vars to enable.",
      );
    }
  }

  async send(
    to: string,
    subject: string,
    body: string,
  ): Promise<EmailSendResult> {
    if (!this.transporter) {
      return { success: false, error: "SMTP not configured" };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html: body,
      });

      this.logger.log(`Email sent to ${to} (messageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Email to ${to} failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}
