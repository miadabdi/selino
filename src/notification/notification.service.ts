import { Injectable, Logger } from "@nestjs/common";
import { TXContext } from "../database/database.types";
import type { SendNotificationOptions } from "./interfaces/send-notification.interface";
import { DeliveryStatus } from "./notification.enums";
import { NotificationProducer } from "./notification.producer";
import { NotificationRepository } from "./notification.repository";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly producer: NotificationProducer,
  ) {}

  /**
   * Queue a notification for delivery through the specified channel.
   *
   * - Persists DB records (notification + pending delivery) when `userId` is provided.
   * - Publishes a job to RabbitMQ; the consumer handles the actual dispatch
   *   via the channel handler (strategy pattern).
   */
  async send(
    options: SendNotificationOptions,
    txContext: TXContext = this.notificationRepository.db,
  ): Promise<void> {
    const { channel, destination, body, title, type, userId, metadata } =
      options;

    let deliveryId: number | undefined;

    if (userId) {
      const createdNotificationId =
        await this.notificationRepository.createNotification(
          userId,
          type,
          title,
          body,
          txContext,
        );

      deliveryId = await this.notificationRepository.createDelivery(
        createdNotificationId,
        channel,
        destination,
        DeliveryStatus.PENDING,
        txContext,
      );
    }

    await this.producer.publish({
      deliveryId,
      channel,
      destination,
      body,
      title,
      type,
      metadata,
    });

    this.logger.debug(`Notification queued via ${channel} → ${destination}`);
  }
}
