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
   */
  abstract send(
    destination: string,
    body: string,
    title?: string,
  ): Promise<ChannelSendResult>;
}
