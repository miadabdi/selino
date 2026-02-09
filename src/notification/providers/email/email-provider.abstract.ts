/**
 * Result of an email send attempt.
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Abstract email provider.
 * Implement this for each concrete email gateway (SMTP, SES, SendGrid, etc.).
 */
export abstract class EmailProvider {
  /**
   * Send an email.
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param body - Email body (HTML)
   */
  abstract send(
    to: string,
    subject: string,
    body: string,
  ): Promise<EmailSendResult>;
}
