import type { NotificationChannel } from "../notification.enums.js";

/**
 * Payload published to the notification RabbitMQ queue.
 */
export interface NotificationJobPayload {
  /** Delivery record ID (to update status after send). Undefined for anonymous sends. */
  deliveryId?: number;

  /** Channel type – determines which queue / handler processes the message. */
  channel: NotificationChannel;

  /** Recipient address (phone number, email, device token, etc.). */
  destination: string;

  /** Notification body / message content. */
  body: string;

  /** Optional title / subject. */
  title?: string;

  /** Notification type identifier (e.g. "otp", "welcome"). */
  type?: string;

  /** Optional provider-specific metadata (e.g. { code } for OTP). */
  metadata?: Record<string, unknown>;
}
