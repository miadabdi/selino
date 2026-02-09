/**
 * Result of an SMS send attempt.
 */
export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Abstract SMS provider interface.
 * Implement this interface for each concrete SMS provider (e.g. Twilio, Kavenegar, etc.).
 */
export abstract class SmsProvider {
  /**
   * Send an SMS message to the given phone number.
   * @param phone - The destination phone number in E.164 format
   * @param message - The message body
   * @returns Result of the send attempt
   */
  abstract send(phone: string, message: string): Promise<SmsSendResult>;
}
