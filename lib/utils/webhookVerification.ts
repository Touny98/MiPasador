import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify WhatsApp webhook signature using HMAC-SHA256
 * @param payload Raw request body as string
 * @param signature Signature from x-hub-signature-256 header (format: sha256=<hex>)
 * @param secret APP_SECRET from Meta app settings
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  // Expected format: 'sha256=<hex_signature>'
  const match = signature.match(/^sha256=(.+)$/);
  if (!match) return false;

  const receivedSignature = match[1];
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(receivedSignature);
  // timingSafeEqual throws if lengths differ — check first to avoid crash
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}