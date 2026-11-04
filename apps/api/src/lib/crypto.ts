// Reversible encryption for invite tokens so staff can re-display a vendor's link. Key derived from SESSION_SECRET.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { config } from '../config.js';
const key = createHash('sha256').update(`invite:${config.sessionSecret}`).digest();
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url');
}
export function decrypt(blob: string): string | undefined {
  try {
    const b = Buffer.from(blob, 'base64url');
    const d = createDecipheriv('aes-256-gcm', key, b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
  } catch { return undefined; }
}
