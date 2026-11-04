import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');
export const hmac = (secret: string, s: string): string => createHmac('sha256', secret).update(s).digest('hex');
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
