// Staff authentication: magic links + session cookie. Vendors never log in; they hold an invite token.
import type { NextFunction, Request, Response } from 'express';
import { parse as parseCookie, serialize } from 'cookie';
import type { Country, Role, User, Vendor } from '@vendorhub/shared';
import { config } from '../config.js';
import { deleteSession, getSessionUser, insertSession, type DB } from '../db/index.js';
import { sha256 } from '../lib/hash.js';
import { randomToken } from '../lib/ids.js';
import { addDays, nowIso } from '../lib/time.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export const COOKIE = 'vh_session';
const SESSION_DAYS = 14;

declare module 'express-serve-static-core' {
  interface Request { user?: User; db: DB }
}

export function startSession(db: DB, res: Response, user: User): void {
  const token = randomToken(32);
  insertSession(db, sha256(token), user.id, addDays(nowIso(), SESSION_DAYS));
  res.setHeader('Set-Cookie', serialize(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.publicUrl.startsWith('https'), path: '/', maxAge: SESSION_DAYS * 86400 }));
}
export function endSession(db: DB, req: Request, res: Response): void {
  const token = readCookie(req);
  if (token) deleteSession(db, sha256(token));
  res.setHeader('Set-Cookie', serialize(COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 }));
}
function readCookie(req: Request): string | undefined {
  return parseCookie(req.headers.cookie ?? '')[COOKIE];
}
/** Attaches req.user when a valid session cookie is present. Never fails. */
export function attachUser(db: DB) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.db = db;
    const token = readCookie(req);
    if (token) req.user = getSessionUser(db, sha256(token));
    next();
  };
}
export function requireStaff(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(unauthorized());
  next();
}
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden(`Needs role: ${roles.join(' or ')}`));
    next();
  };
}
/** Market scoping: users with a market list only see vendors in those markets. */
export function canSee(user: User, v: Pick<Vendor, 'country'>): boolean {
  return user.role === 'admin' || user.markets === 'all' || (user.markets as Country[]).includes(v.country);
}
/** People fields everywhere (invitedBy, assignee, actor, by) are display names, as the web compares them to user.name. */
export const displayName = (u: User) => u.name;
