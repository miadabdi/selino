/**
 * Result of a channel send attempt.
 */
export interface ChannelSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Abstract notification channel handler (Strategy interface).
 *
 * Each concrete channel (SMS, Email, Push, etc.) implements this interface
 * so the NotificationService can dispatch through any channel uniformly.
 */
export abstract class NotificationChannelHandler {
  /**
   * Send a message through this channel.
   * @param destination - The recipient address (phone, email, device token, etc.)
   * @param body - The message body / content
   * @param title - Optional title / subject
   * @param type - Optional notification type (e.g. "otp")
   * @param metadata - Optional provider-specific metadata
   */
  abstract send(
    destination: string,
    body: string,
    title?: string,
    type?: string,
    metadata?: Record<string, unknown>,
  ): Promise<ChannelSendResult>;
}
