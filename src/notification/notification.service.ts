import { Injectable, Logger } from "@nestjs/common";
import type { SendNotificationOptions } from "./interfaces/send-notification.interface.js";
import { NotificationRepository } from "./notification.repository.js";
import { DeliveryStatus } from "./notification.enums.js";
import { NotificationProducer } from "./notification.producer.js";

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
  async send(options: SendNotificationOptions): Promise<void> {
    const { channel, destination, body, title, type, userId, metadata } =
      options;

    let notificationId: number | undefined;
    if (userId) {
      notificationId = await this.notificationRepository.createNotification(
        userId,
        type,
        title,
        body,
      );
    }

    let deliveryId: number | undefined;
    if (notificationId) {
      deliveryId = await this.notificationRepository.createDelivery(
        notificationId,
        channel,
        destination,
        DeliveryStatus.PENDING,
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
