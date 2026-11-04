import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { consumeLoginToken, getSettings, getUserByEmail, insertLoginToken, updateUser, type DB } from '../db/index.js';
import { endSession, startSession } from '../auth/index.js';
import { sha256 } from '../lib/hash.js';
import { randomToken } from '../lib/ids.js';
import { addMinutes, nowIso } from '../lib/time.js';
import { parse } from '../lib/validate.js';
import { badRequest, forbidden } from '../lib/errors.js';
import { sendEmail, templates } from '../services/email.js';

export function authRoutes(db: DB): Router {
  const r = Router();

  // Always 200: the response must not reveal whether the email belongs to a user.
  r.post('/request-link', async (req, res, next) => {
    try {
      const { email } = parse(z.object({ email: z.string().email() }), req.body);
      const user = getUserByEmail(db, email);
      if (user && user.active) {
        const token = randomToken(32);
        insertLoginToken(db, sha256(token), email, addMinutes(nowIso(), 15));
        await sendEmail(db, templates.magicLink(email, `${config.publicUrl}/api/auth/callback?token=${token}`));
      }
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  r.get('/callback', (req, res, next) => {
    try {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      const email = token && consumeLoginToken(db, sha256(token));
      if (!email) return res.redirect(`${config.publicUrl}/app/login?error=expired`);
      const user = getUserByEmail(db, email);
      if (!user || !user.active) return res.redirect(`${config.publicUrl}/app/login?error=unknown`);
      updateUser(db, user.id, { lastLoginAt: nowIso() });
      startSession(db, res, user);
      res.redirect(`${config.publicUrl}/app`);
    } catch (e) { next(e); }
  });

  r.post('/demo-login', (req, res, next) => {
    try {
      if (config.mode !== 'demo') throw forbidden('Demo login is disabled in live mode');
      const { email } = parse(z.object({ email: z.string().email() }), req.body);
      const user = getUserByEmail(db, email);
      if (!user || !user.active) throw badRequest('Unknown demo user');
      updateUser(db, user.id, { lastLoginAt: nowIso() });
      startSession(db, res, user);
      res.json({ user });
    } catch (e) { next(e); }
  });

  r.post('/logout', (req, res) => { endSession(db, req, res); res.json({ ok: true }); });

  r.get('/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: { code: 'unauthenticated', message: 'Sign in required' }, mode: config.mode });
    res.json({ user: req.user, mode: config.mode, settings: getSettings(db) });
  });
  return r;
}
