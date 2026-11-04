import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { config } from '../config.js';
import { getDocument, getVendorByTokenHash, type DB } from '../db/index.js';
import { sha256 } from '../lib/hash.js';
import { forbidden, notFound } from '../lib/errors.js';
import { canSee } from '../auth/index.js';

/** Streams a stored document. Staff sessions, or the vendor who owns it (token in ?t=). */
export function fileRoutes(db: DB): Router {
  const r = Router();
  r.get('/:id', (req, res, next) => {
    try {
      const doc = getDocument(db, req.params.id);
      if (!doc) throw notFound('File not found');
      let allowed = false;
      if (req.user) {
        const vendor = db.prepare('SELECT country FROM vendors WHERE id = ?').get(doc.vendorId) as { country: 'KSA' } | undefined;
        allowed = !!vendor && canSee(req.user, vendor);
      } else if (typeof req.query.t === 'string') {
        const v = getVendorByTokenHash(db, sha256(req.query.t));
        allowed = !!v && v.id === doc.vendorId;
      }
      if (!allowed) throw forbidden('Not allowed to view this file');
      const full = path.resolve(config.dataDir, doc.storageKey);
      if (!full.startsWith(config.dataDir) || !fs.existsSync(full)) throw notFound('File missing from storage');
      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
      res.setHeader('Cache-Control', 'private, max-age=300');
      fs.createReadStream(full).pipe(res);
    } catch (e) { next(e); }
  });
  return r;
}
