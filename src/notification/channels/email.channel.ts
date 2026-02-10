import { Injectable } from "@nestjs/common";
import {
  NotificationChannelHandler,
  type ChannelSendResult,
} from "../interfaces/notification-channel.interface.js";
import { EmailProvider } from "../providers/email/email-provider.abstract.js";

/**
 * Email channel handler.
 * Delegates to the configured EmailProvider implementation (SMTP, etc.).
 */
@Injectable()
export class EmailChannelHandler extends NotificationChannelHandler {
  constructor(private readonly emailProvider: EmailProvider) {
    super();
  }

  async send(
    destination: string,
    body: string,
    title?: string,
    _type?: string,
    _metadata?: Record<string, unknown>,
  ): Promise<ChannelSendResult> {
    return this.emailProvider.send(destination, title ?? "", body);
  }
}
