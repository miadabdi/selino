import { Inject, Injectable, Logger } from "@nestjs/common";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import {
  notificationDeliveries,
  notifications,
} from "../database/schema/index.js";
import type { SendNotificationOptions } from "./interfaces/send-notification.interface.js";
import { DeliveryStatus } from "./notification.enums.js";
import { NotificationProducer } from "./notification.producer.js";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
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
    const { channel, destination, body, title, type, userId } = options;

    let notificationId: number | undefined;
    if (userId) {
      const [notification] = await this.db
        .insert(notifications)
        .values({ userId, type, title, body })
        .returning();
      notificationId = notification.id;
    }

    let deliveryId: number | undefined;
    if (notificationId) {
      const [delivery] = await this.db
        .insert(notificationDeliveries)
        .values({
          notificationId,
          channel,
          destination,
          status: DeliveryStatus.PENDING,
        })
        .returning();
      deliveryId = delivery.id;
    }

    await this.producer.publish({
      deliveryId,
      channel,
      destination,
      body,
      title,
    });

    this.logger.debug(`Notification queued via ${channel} → ${destination}`);
  }
}
