/**
 * Result of an SMS send attempt.
 */
export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Abstract SMS provider.
 * Implement this for each concrete SMS gateway (Kavenegar, Twilio, etc.).
 */
export abstract class SmsProvider {
  /**
   * Send an SMS message.
   * @param phone - Destination phone number
   * @param message - Message body
   */
  abstract send(phone: string, message: string): Promise<SmsSendResult>;

  /**
   * Send a verification code via a provider-specific verify-code API.
   * Falls back to plain `send()` by default.
   * @param phone - Destination phone number
   * @param code - Verification code
   */
  sendVerifyCode(phone: string, code: string): Promise<SmsSendResult> {
    return this.send(phone, `Your verification code is: ${code}`);
  }
}
