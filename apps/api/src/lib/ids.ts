import { randomBytes, randomUUID } from 'node:crypto';
export const uuid = (): string => randomUUID();
/** URL-safe random token (base64url), default 32 bytes. */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');
