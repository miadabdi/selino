import { RABBITMQ_EXCHANGE_NOTIFICATION } from "../rabbitmq/rabbitmq.module.js";
import type { NotificationChannel } from "./notification.enums.js";

/**
 * Injection token for the channel handler registry.
 */
export const NOTIFICATION_CHANNELS = Symbol("NOTIFICATION_CHANNELS");

export const NOTIFICATION_EXCHANGE = RABBITMQ_EXCHANGE_NOTIFICATION;
export const NOTIFICATION_QUEUE_SMS = "notification.sms";
export const NOTIFICATION_QUEUE_EMAIL = "notification.email";

/**
 * Build the routing key for a given notification channel.
 */
export function routingKeyFor(channel: NotificationChannel): string {
  return `notification.${channel}`;
}
