import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import { notificationDeliveries } from "../database/schema/index.js";
import type { NotificationChannelHandler } from "./interfaces/notification-channel.interface.js";
import type { NotificationJobPayload } from "./interfaces/notification-job.interface.js";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EXCHANGE,
  NOTIFICATION_QUEUE_EMAIL,
  NOTIFICATION_QUEUE_SMS,
} from "./notification.constants.js";
import { DeliveryStatus, NotificationChannel } from "./notification.enums.js";

/**
 * Consumes notification jobs from RabbitMQ queues and dispatches them
 * through the appropriate channel handler (strategy pattern).
 */
@Injectable()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(NOTIFICATION_CHANNELS)
    private readonly channels: Map<
      NotificationChannel,
      NotificationChannelHandler
    >,
  ) {}

  @RabbitSubscribe({
    exchange: NOTIFICATION_EXCHANGE,
    routingKey: "notification.sms",
    queue: NOTIFICATION_QUEUE_SMS,
  })
  async handleSms(payload: NotificationJobPayload): Promise<void> {
    await this.processJob(payload);
  }

  @RabbitSubscribe({
    exchange: NOTIFICATION_EXCHANGE,
    routingKey: "notification.email",
    queue: NOTIFICATION_QUEUE_EMAIL,
  })
  async handleEmail(payload: NotificationJobPayload): Promise<void> {
    await this.processJob(payload);
  }

  // ── Shared processing logic ────────────────────────────────
  private async processJob(payload: NotificationJobPayload): Promise<void> {
    const { channel, destination, body, title, deliveryId, type, metadata } =
      payload;

    this.logger.debug(`Processing ${channel} notification → ${destination}`);

    const handler = this.channels.get(channel);
    if (!handler) {
      this.logger.error(`No handler registered for channel: ${channel}`);
      await this.markFailed(
        deliveryId,
        `No handler registered for channel: ${channel}`,
      );
      return;
    }

    try {
      const result = await handler.send(
        destination,
        body,
        title,
        type,
        metadata,
      );

      if (deliveryId) {
        await this.db
          .update(notificationDeliveries)
          .set({
            status: result.success
              ? DeliveryStatus.SENT
              : DeliveryStatus.FAILED,
            error: result.error ?? null,
          })
          .where(eq(notificationDeliveries.id, deliveryId));
      }

      if (!result.success) {
        this.logger.warn(
          `Notification delivery failed via ${channel} to ${destination}: ${result.error}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Notification delivery threw via ${channel} to ${destination}: ${errorMessage}`,
      );
      await this.markFailed(deliveryId, errorMessage);
    }
  }

  private async markFailed(
    deliveryId: number | undefined,
    error: string,
  ): Promise<void> {
    if (!deliveryId) return;
    await this.db
      .update(notificationDeliveries)
      .set({ status: DeliveryStatus.FAILED, error })
      .where(eq(notificationDeliveries.id, deliveryId));
  }
}
