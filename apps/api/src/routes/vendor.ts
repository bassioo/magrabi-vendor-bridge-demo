import fs from 'node:fs';
import path from 'node:path';
import { Router, type Request } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { countryIbanPrefix, validateIban, type CountryProfile, type Vendor } from '@vendorhub/shared';

/** Tax format check against the stored (possibly admin-edited) profile. */
function vatFormatFor(p: CountryProfile, value: string) {
  const t = p.tax;
  const v = (value || '').replace(/\s+/g, '');
  if (!t.applicable && !v) return { ok: true, optional: true, message: t.format, messageAr: t.formatAr };
  const ok = new RegExp(t.pattern.source, 'i').test(v);
  return ok ? { ok: true, optional: !t.applicable, message: `Format valid · ${t.format}`, messageAr: `الصيغة صحيحة · ${t.formatAr}` } : { ok: false, optional: !t.applicable, message: `Expected format: ${t.format}.`, messageAr: `الصيغة المتوقعة: ${t.formatAr}.` };
}
import { config } from '../config.js';
import { addAudit, getCountryProfile, getSettings, getVendor, getVendorByTokenHash, listAudit, listDocuments, removeCurrentDocument, updateVendor, type DB } from '../db/index.js';
import { sha256 } from '../lib/hash.js';
import { HttpError, badRequest, notFound, unprocessable } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { lookupCompany } from '../services/registries.js';
import { processUpload } from '../services/extraction.js';
import { submit } from '../services/workflow.js';
import { nowIso } from '../lib/time.js';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['application/pdf', 'image/png', 'image/jpeg']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => { fs.mkdirSync(config.uploadsDir, { recursive: true }); cb(null, config.uploadsDir); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(file.originalname).toLowerCase().slice(0, 6)}`),
  }),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => (ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new HttpError(415, 'unsupported_type', 'Please upload a PDF, PNG or JPG'))),
});

const contact = z.object({ name: z.string().max(120), email: z.string().max(200), phone: z.string().max(40) }).partial();
const patchSchema = z.object({
  lang: z.enum(['en', 'ar']).optional(),
  stage: z.enum(['welcome', 'form', 'documents', 'review', 'status']).optional(),
  formStep: z.number().int().min(0).max(3).optional(),
  company: z.object({ regNumber: z.string().max(40), legalName: z.string().max(200), legalNameAr: z.string().max(200), regStatus: z.string().max(40), issueDate: z.string().max(10), expiryDate: z.string().max(10), city: z.string().max(80), address: z.string().max(300) }).partial().optional(),
  tax: z.object({ vatNumber: z.string().max(40) }).partial().optional(),
  bank: z.object({ iban: z.string().max(40), bankName: z.string().max(120), accountHolder: z.string().max(200), swift: z.string().max(16) }).partial().optional(),
  contacts: z.object({ sales: contact, ar: contact }).partial().optional(),
});

export function vendorRoutes(db: DB): Router {
  const r = Router();

  function load(req: Request): Vendor {
    const v = getVendorByTokenHash(db, sha256(req.params.token));
    if (!v) throw notFound('This invitation link is not recognised');
    if (v.status === 'expired' || (['invited', 'draft'].includes(v.status) && v.inviteExpiresAt < nowIso())) throw new HttpError(410, 'expired', 'This invitation link has expired. Ask procurement for a new one.');
    return v;
  }
  const editable = (v: Vendor) => ['invited', 'draft', 'returned'].includes(v.status);
  const withDocs = (v: Vendor) => ({ ...v, documents: listDocuments(db, v.id) });

  r.get('/:token', (req, res, next) => {
    try {
      const v = load(req);
      res.json({ vendor: withDocs(v), profile: getCountryProfile(db, v.country), settings: { bankLetterMaxMonths: getSettings(db).bankLetterMaxMonths }, mode: config.mode });
    } catch (e) { next(e); }
  });

  r.patch('/:token', (req, res, next) => {
    try {
      const v = load(req);
      const body = parse(patchSchema, req.body);
      if (body.lang && body.lang !== v.lang) { v.lang = body.lang; }
      if (!editable(v)) {
        // after submission only the language may change
        updateVendor(db, v);
        if (Object.keys(body).some((k) => k !== 'lang')) throw unprocessable('The registration has been submitted and can no longer be edited');
        return res.json({ vendor: withDocs(v) });
      }
      const wasFresh = v.status === 'invited';
      if (body.stage) v.stage = body.stage;
      if (body.formStep !== undefined) v.formStep = body.formStep;
      if (body.company) {
        const changedReg = body.company.regNumber !== undefined && body.company.regNumber !== v.company.regNumber;
        v.company = { ...v.company, ...body.company };
        if (changedReg) { v.company.verifiedBy = undefined; v.company.verifiedAt = undefined; }
        if (v.company.legalName) v.name = v.company.legalName;
      }
      if (body.tax) v.tax = { ...v.tax, ...body.tax };
      if (body.bank) v.bank = { ...v.bank, ...body.bank, iban: body.bank.iban !== undefined ? body.bank.iban.replace(/\s+/g, '').toUpperCase() : v.bank.iban };
      if (body.contacts) v.contacts = { sales: { ...v.contacts.sales, ...(body.contacts.sales ?? {}) }, ar: { ...v.contacts.ar, ...(body.contacts.ar ?? {}) } };
      if (v.status === 'invited' && (body.stage && body.stage !== 'welcome')) v.status = 'draft';
      if (v.status === 'returned' && body.stage && body.stage !== 'status') { /* vendor is updating after a return; status stays returned until resubmit */ }
      updateVendor(db, v);
      if (wasFresh && v.status === 'draft') addAudit(db, v.id, 'Vendor', 'system', `Opened invitation (${v.lang === 'ar' ? 'Arabic' : 'English'}) and started the form`);
      res.json({ vendor: withDocs(v) });
    } catch (e) { next(e); }
  });

  r.post('/:token/lookup', async (req, res, next) => {
    try {
      const v = load(req);
      const { regNumber } = parse(z.object({ regNumber: z.string().min(2).max(40) }), req.body);
      const result = await lookupCompany(v.country, regNumber);
      if (result.found && result.company && editable(v)) {
        v.company = { ...v.company, ...result.company, regNumber };
        v.name = v.company.legalName || v.name;
        updateVendor(db, v);
        addAudit(db, v.id, 'System', 'registry', `${result.registry}${result.provider === 'simulated' ? ' (simulated)' : ''}: ${regNumber} found · ${result.company.legalName} · ${result.company.regStatus}`, `${result.latencyMs} ms`);
      } else if (!result.found) {
        addAudit(db, v.id, 'System', 'registry', result.provider === 'manual' ? `${result.registry}: not connected · vendor typed the details, a person will confirm` : `${result.registry}${result.provider === 'simulated' ? ' (simulated)' : ''}: ${regNumber} not found · vendor asked to enter details manually`, `${result.latencyMs} ms`);
      }
      res.json({ found: result.found, registry: result.registry, provider: result.provider, company: result.company });
    } catch (e) { next(e); }
  });

  r.post('/:token/validate', (req, res, next) => {
    try {
      const v = load(req);
      const body = parse(z.object({ iban: z.string().max(40).optional(), vatNumber: z.string().max(40).optional() }), req.body);
      const out: Record<string, unknown> = {};
      if (body.iban !== undefined) {
        const r2 = validateIban(body.iban, countryIbanPrefix(v.country));
        out.iban = r2;
        if (r2.ok && editable(v)) addAudit(db, v.id, 'System', 'rule', 'IBAN checksum valid (mod-97)', r2.iban);
      }
      if (body.vatNumber !== undefined) out.vat = vatFormatFor(getCountryProfile(db, v.country), body.vatNumber);
      res.json(out);
    } catch (e) { next(e); }
  });

  r.post('/:token/documents/:slotId', (req, res, next) => {
    upload.single('file')(req, res, async (err: unknown) => {
      try {
        if (err) throw err instanceof HttpError ? err : badRequest((err as Error).message === 'File too large' ? 'The file is larger than 10 MB' : (err as Error).message);
        const v = load(req);
        if (!editable(v)) throw unprocessable('The registration has been submitted and can no longer be edited');
        const profile = getCountryProfile(db, v.country);
        const slot = profile.checklist.find((s) => s.id === req.params.slotId);
        if (!slot) throw notFound('Unknown document slot');
        if (!req.file) throw badRequest('No file received');
        const doc = await processUpload(db, v, slot, { path: req.file.path, fileName: req.file.originalname, mimeType: req.file.mimetype, sizeBytes: req.file.size, storageKey: path.relative(config.dataDir, req.file.path) });
        if (v.status === 'invited') { v.status = 'draft'; updateVendor(db, v); }
        res.json({ document: doc });
      } catch (e) { next(e); }
    });
  });

  r.delete('/:token/documents/:slotId', (req, res, next) => {
    try {
      const v = load(req);
      if (!editable(v)) throw unprocessable('The registration has been submitted and can no longer be edited');
      removeCurrentDocument(db, v.id, req.params.slotId);
      addAudit(db, v.id, 'Vendor', 'upload', `Removed ${req.params.slotId}`);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  r.post('/:token/submit', async (req, res, next) => {
    try {
      const v = load(req);
      parse(z.object({ confirm: z.literal(true) }), req.body);
      if (!editable(v)) throw unprocessable('Already submitted');
      const out = await submit(db, v);
      res.json({ vendor: withDocs(out) });
    } catch (e) { next(e); }
  });

  r.get('/:token/status', (req, res, next) => {
    try {
      const v = load(req);
      const timeline = listAudit(db, v.id).filter((a) => a.kind === 'system' || (a.kind === 'review' && /Returned|Approved|issued|Rejected/.test(a.message))).map((a) => ({ at: a.at, message: a.message }));
      res.json({ vendor: withDocs(getVendor(db, v.id)!), timeline });
    } catch (e) { next(e); }
  });
  return r;
}
