import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import type { NotificationJobPayload } from "./interfaces/notification-job.interface.js";
import {
  NOTIFICATION_EXCHANGE,
  routingKeyFor,
} from "./notification.constants.js";

/**
 * Publishes notification delivery jobs to RabbitMQ.
 *
 * Messages are routed to per-channel queues via the topic exchange
 * using routing keys like `notification.sms`, `notification.email`, etc.
 */
@Injectable()
export class NotificationProducer {
  private readonly logger = new Logger(NotificationProducer.name);

  constructor(private readonly amqp: AmqpConnection) {}

  /**
   * Publish a notification job to RabbitMQ.
   */
  async publish(payload: NotificationJobPayload): Promise<void> {
    const routingKey = routingKeyFor(payload.channel);

    this.logger.debug(
      `Publishing notification job to ${NOTIFICATION_EXCHANGE}/${routingKey} → ${payload.destination}`,
    );

    await this.amqp.publish(NOTIFICATION_EXCHANGE, routingKey, payload);
  }
}
