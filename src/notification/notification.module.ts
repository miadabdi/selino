import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailChannelHandler } from "./channels/email.channel";
import { SmsChannelHandler } from "./channels/sms.channel";
import type { NotificationChannelHandler } from "./interfaces/notification-channel.interface";
import { NOTIFICATION_CHANNELS } from "./notification.constants";
import { NotificationConsumer } from "./notification.consumer";
import { NotificationChannel } from "./notification.enums";
import { NotificationProducer } from "./notification.producer";
import { NotificationRepository } from "./notification.repository";
import { NotificationService } from "./notification.service";
import { EmailProvider } from "./providers/email/email-provider.abstract";
import { SmtpEmailProvider } from "./providers/email/smtp-email.provider";
import { ConsoleSmsProvider } from "./providers/sms/console-sms.provider";
import { KavenegarSmsProvider } from "./providers/sms/kavenegar-sms.provider";
import { SmsProvider } from "./providers/sms/sms-provider.abstract";
import { SmsirSmsProvider } from "./providers/sms/smsir-sms.provider";

@Module({
  providers: [
    // ── SMS provider (selected via SMS_PROVIDER env var) ──
    {
      provide: SmsProvider,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>("SMS_PROVIDER", "console");
        if (provider === "kavenegar") {
          return new KavenegarSmsProvider(configService);
        }
        if (provider === "smsir") {
          return new SmsirSmsProvider(configService);
        }
        return new ConsoleSmsProvider();
      },
      inject: [ConfigService],
    },

    // ── Email provider ──
    SmtpEmailProvider,
    {
      provide: EmailProvider,
      useExisting: SmtpEmailProvider,
    },

    // ── Channel handlers (strategy implementations) ──
    SmsChannelHandler,
    EmailChannelHandler,

    // ── Channel registry (maps channel enum → handler) ──
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (
        smsChannel: SmsChannelHandler,
        emailChannel: EmailChannelHandler,
      ) => {
        return new Map<NotificationChannel, NotificationChannelHandler>([
          [NotificationChannel.SMS, smsChannel],
          [NotificationChannel.EMAIL, emailChannel],
        ]);
      },
      inject: [SmsChannelHandler, EmailChannelHandler],
    },

    // ── RabbitMQ producer & consumer ──
    NotificationProducer,
    NotificationConsumer,
    NotificationRepository,

    // ── Core service ──
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
