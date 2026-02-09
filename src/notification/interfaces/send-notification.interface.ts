import { NotificationChannel } from "../notification.enums.js";

/**
 * Options for sending a notification.
 */
export interface SendNotificationOptions {
  /** Recipient user ID. If provided, a notification record is persisted. */
  userId?: number;

  /** Delivery channel (sms, email, etc.) */
  channel: NotificationChannel;

  /** Recipient address – phone number, email, device token, etc. */
  destination: string;

  /** Notification type identifier (e.g. "otp", "welcome", "order_update"). */
  type: string;

  /** Optional notification title / email subject. */
  title?: string;

  /** Notification body / message content. */
  body: string;
}
