import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailChannelHandler } from "./channels/email.channel.js";
import { SmsChannelHandler } from "./channels/sms.channel.js";
import type { NotificationChannelHandler } from "./interfaces/notification-channel.interface.js";
import { NOTIFICATION_CHANNELS } from "./notification.constants.js";
import { NotificationConsumer } from "./notification.consumer.js";
import { NotificationChannel } from "./notification.enums.js";
import { NotificationProducer } from "./notification.producer.js";
import { NotificationService } from "./notification.service.js";
import { EmailProvider } from "./providers/email/email-provider.abstract.js";
import { SmtpEmailProvider } from "./providers/email/smtp-email.provider.js";
import { ConsoleSmsProvider } from "./providers/sms/console-sms.provider.js";
import { KavenegarSmsProvider } from "./providers/sms/kavenegar-sms.provider.js";
import { SmsProvider } from "./providers/sms/sms-provider.abstract.js";
import { SmsirSmsProvider } from "./providers/sms/smsir-sms.provider.js";

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

    // ── Core service ──
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
