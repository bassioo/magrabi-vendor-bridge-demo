import { Router, type Request } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { COUNTRY_ORDER, CATEGORIES, findDuplicates, type Country, type CountryProfile, type Settings, type Vendor } from '@vendorhub/shared';
import { config } from '../config.js';
import { addNote, getSettings, getUserById, getVendor, insertUser, listAudit, listCountryProfiles, listDocuments, listEmails, listNotes, listRegistryChecks, listSapVendors, listUsers, patchSettings, putCountryProfile, reviveProfile, updateUser, upsertSapVendor, type DB } from '../db/index.js';
import { canSee, displayName, requireRole, requireStaff } from '../auth/index.js';
import { parse } from '../lib/validate.js';
import { badRequest, forbidden, notFound, unprocessable } from '../lib/errors.js';
import { parseCsv, toCsv } from '../lib/csv.js';
import * as wf from '../services/workflow.js';
import { runPostSubmitChecks } from '../services/registries.js';
import { draftReturnNote } from '../services/returnDraft.js';
import { sapCsv, sapRows } from '../services/sapSheet.js';
import { seedDemo } from '../db/seed.js';
import { nowIso } from '../lib/time.js';

const lastSeen = new Map<string, string>(); // notifications read marker per user (in-memory is fine: it is a convenience)

export function staffRoutes(db: DB): Router {
  const r = Router();
  r.use(requireStaff);

  const visible = (req: Request) => (v: Vendor) => canSee(req.user!, v);
  function loadVendor(req: Request): Vendor {
    const v = getVendor(db, req.params.id);
    if (!v) throw notFound('Vendor not found');
    if (!canSee(req.user!, v)) throw forbidden('This vendor is outside your markets');
    return v;
  }
  const detail = (v: Vendor) => ({ ...v, documents: listDocuments(db, v.id), audit: listAudit(db, v.id), notes: listNotes(db, v.id), registryChecks: listRegistryChecks(db, v.id) });

  r.get('/dashboard', (req, res) => res.json(wf.dashboard(db, visible(req))));

  r.get('/vendors', (req, res, next) => {
    try {
      const q = parse(z.object({ status: z.enum(['queue', 'returned', 'approved', 'invited', 'all']).default('queue'), country: z.string().optional(), q: z.string().optional(), sort: z.enum(['date', 'name', 'country', 'status']).default('date') }), req.query);
      const statuses: Record<string, Vendor['status'][]> = { queue: ['submitted', 'in_review'], returned: ['returned'], approved: ['approved', 'code_issued'], invited: ['invited', 'draft', 'expired'], all: ['invited', 'draft', 'submitted', 'in_review', 'returned', 'approved', 'code_issued', 'rejected', 'expired'] };
      let rows = wf.listRows(db, visible(req)).filter((v) => statuses[q.status].includes(v.status));
      if (q.country && q.country !== 'all') rows = rows.filter((v) => v.country === q.country);
      if (q.q) { const s = q.q.toLowerCase(); rows = rows.filter((v) => `${v.name} ${v.email} ${v.company.regNumber} ${v.vendorCode ?? ''}`.toLowerCase().includes(s)); }
      rows.sort((a, b) => q.sort === 'name' ? (a.name || a.email).localeCompare(b.name || b.email) : q.sort === 'country' ? a.country.localeCompare(b.country) : q.sort === 'status' ? a.status.localeCompare(b.status) : (b.submittedAt ?? b.invitedAt).localeCompare(a.submittedAt ?? a.invitedAt));
      res.json({ rows });
    } catch (e) { next(e); }
  });

  r.post('/vendors/invite', async (req, res, next) => {
    try {
      const body = parse(z.object({ email: z.string().email(), country: z.enum(COUNTRY_ORDER as [Country, ...Country[]]), category: z.string().min(2).max(80), lang: z.enum(['en', 'ar']).optional() }), req.body);
      if (req.user!.role === 'approver') throw forbidden('Approvers do not invite vendors (segregation of duties); ask a requester or an admin');
      if (!canSee(req.user!, { country: body.country })) throw forbidden('This market is outside your scope');
      const out = await wf.invite(db, req.user!, body);
      res.json({ vendor: out.vendor, link: wf.vendorLinkFor(out.token), reused: out.reused });
    } catch (e) { next(e); }
  });

  r.get('/vendors/:id', (req, res, next) => {
    try {
      let v = loadVendor(req);
      if (v.status === 'submitted') v = wf.openForReview(db, req.user!, v);
      const summary = wf.summaryFor(db, v);
      const sapMatch = findDuplicates(v, listSapVendors(db))[0];
      res.json({ vendor: detail(v), summary, sapMatch, blockers: wf.approvalBlockers(db, req.user!, v), categories: CATEGORIES, inviteLink: wf.currentInviteLink(db, v.id) });
    } catch (e) { next(e); }
  });

  r.post('/vendors/:id/assign', (req, res, next) => {
    try {
      const v = loadVendor(req);
      const { userId } = parse(z.object({ userId: z.string().optional() }), req.body ?? {});
      const to = userId ? getUserById(db, userId) : req.user!;
      if (!to) throw notFound('User not found');
      res.json({ vendor: detail(wf.assign(db, req.user!, v, to)) });
    } catch (e) { next(e); }
  });

  r.post('/vendors/:id/notes', (req, res, next) => {
    try {
      const v = loadVendor(req);
      const { text } = parse(z.object({ text: z.string().min(1).max(2000) }), req.body);
      const note = addNote(db, v.id, displayName(req.user!), text.trim());
      res.json({ note });
    } catch (e) { next(e); }
  });

  r.post('/vendors/:id/callback', (req, res, next) => {
    try {
      const v = loadVendor(req);
      const { phone } = parse(z.object({ confirmed: z.literal(true), phone: z.string().min(3).max(40) }), req.body);
      if (req.user!.role === 'requester') throw forbidden('Only approvers confirm bank details');
      res.json({ vendor: detail(wf.confirmCallback(db, req.user!, v, phone)) });
    } catch (e) { next(e); }
  });

  r.post('/vendors/:id/approve', requireRole('approver', 'admin'), async (req, res, next) => {
    try { res.json({ vendor: detail(await wf.approve(db, req.user!, loadVendor(req))) }); } catch (e) { next(e); }
  });

  r.post('/vendors/:id/return', async (req, res, next) => {
    try {
      const v = loadVendor(req);
      const body = parse(z.object({ en: z.string().min(10).max(6000), ar: z.string().min(5).max(6000), items: z.array(z.string().max(200)).default([]) }), req.body);
      res.json({ vendor: detail(await wf.returnToVendor(db, req.user!, v, body)) });
    } catch (e) { next(e); }
  });

  r.post('/vendors/:id/reject', requireRole('approver', 'admin'), async (req, res, next) => {
    try {
      const { reason } = parse(z.object({ reason: z.string().min(3).max(500) }), req.body);
      res.json({ vendor: detail(await wf.reject(db, req.user!, loadVendor(req), reason)) });
    } catch (e) { next(e); }
  });

  r.get('/vendors/:id/return-draft', async (req, res, next) => {
    try {
      const v = loadVendor(req);
      res.json(await draftReturnNote(v, wf.summaryFor(db, v), listDocuments(db, v.id), displayName(req.user!)));
    } catch (e) { next(e); }
  });

  r.get('/vendors/:id/sap-sheet', (req, res, next) => {
    try {
      const v = loadVendor(req);
      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="sap-keying-${(v.company.legalName || 'vendor').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv"`);
        return res.send(sapCsv(v));
      }
      res.json({ rows: sapRows(v), ready: v.status === 'approved' || v.status === 'code_issued' });
    } catch (e) { next(e); }
  });

  r.post('/vendors/:id/issue-code', requireRole('approver', 'admin'), async (req, res, next) => {
    try {
      const { code } = parse(z.object({ code: z.string().regex(/^[A-Za-z0-9-]{4,20}$/, 'Use 4 to 20 letters, digits or dashes') }), req.body);
      res.json({ vendor: detail(await wf.issueCode(db, req.user!, loadVendor(req), code.trim())) });
    } catch (e) { next(e); }
  });

  r.post('/vendors/:id/resend-invite', async (req, res, next) => {
    try { res.json({ link: wf.vendorLinkFor(await wf.resendInvite(db, req.user!, loadVendor(req).id)) }); } catch (e) { next(e); }
  });

  r.post('/vendors/:id/recheck', async (req, res, next) => {
    try {
      const v = loadVendor(req);
      const registryChecks = await runPostSubmitChecks(db, v.id);
      res.json({ registryChecks, summary: wf.summaryFor(db, v) });
    } catch (e) { next(e); }
  });

  r.get('/sap-vendors', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.toLowerCase() : '';
    res.json({ rows: listSapVendors(db).filter((s) => !q || `${s.code} ${s.name} ${s.nameAr ?? ''} ${s.vatNumber} ${s.regNumber}`.toLowerCase().includes(q)) });
  });

  const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
  r.post('/sap-vendors/import', requireRole('admin'), csvUpload.single('file'), (req, res, next) => {
    try {
      if (!req.file) throw badRequest('Upload a CSV file in the field "file"');
      const rows = parseCsv(req.file.buffer.toString('utf8'));
      if (!rows.length) throw badRequest('The CSV is empty');
      const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
      const idx = (k: string) => header.indexOf(k);
      if (idx('code') < 0 || idx('name') < 0 || idx('country') < 0) throw badRequest('Header must include code, name, country (optional: name_ar, reg_number, vat_number, iban)');
      let imported = 0, skipped = 0;
      for (const row of rows.slice(1)) {
        const country = (row[idx('country')] ?? '').trim().toUpperCase() as Country;
        if (!row[idx('code')] || !COUNTRY_ORDER.includes(country)) { skipped += 1; continue; }
        upsertSapVendor(db, { code: row[idx('code')].trim(), name: row[idx('name')].trim(), nameAr: idx('name_ar') >= 0 ? row[idx('name_ar')]?.trim() : undefined, country, regNumber: idx('reg_number') >= 0 ? row[idx('reg_number')]?.trim() ?? '' : '', vatNumber: idx('vat_number') >= 0 ? row[idx('vat_number')]?.trim() ?? '' : '', iban: idx('iban') >= 0 ? (row[idx('iban')] ?? '').replace(/\s+/g, '').toUpperCase() : '', createdAt: nowIso().slice(0, 10), source: 'import' });
        imported += 1;
      }
      res.json({ imported, skipped });
    } catch (e) { next(e); }
  });

  r.get('/emails', (req, res) => {
    const rows = listEmails(db, typeof req.query.vendorId === 'string' ? req.query.vendorId : undefined);
    const ids = new Set(wf.listRows(db, visible(req)).map((v) => v.id));
    res.json({ rows: rows.filter((e) => !e.vendorId || ids.has(e.vendorId)) });
  });

  r.get('/users', requireRole('admin'), (_req, res) => res.json({ rows: listUsers(db) }));
  r.post('/users', requireRole('admin'), (req, res, next) => {
    try {
      const body = parse(z.object({ email: z.string().email(), name: z.string().min(1).max(80), role: z.enum(['admin', 'approver', 'requester']), markets: z.union([z.literal('all'), z.array(z.enum(COUNTRY_ORDER as [Country, ...Country[]]))]) }), req.body);
      res.json({ user: insertUser(db, body) });
    } catch (e) { next(e); }
  });
  r.patch('/users/:id', requireRole('admin'), (req, res, next) => {
    try {
      const body = parse(z.object({ name: z.string().min(1).max(80).optional(), role: z.enum(['admin', 'approver', 'requester']).optional(), markets: z.union([z.literal('all'), z.array(z.enum(COUNTRY_ORDER as [Country, ...Country[]]))]).optional(), active: z.boolean().optional() }), req.body);
      if (!getUserById(db, req.params.id)) throw notFound('User not found');
      if (req.params.id === req.user!.id && body.active === false) throw badRequest('You cannot deactivate yourself');
      res.json({ user: updateUser(db, req.params.id, body) });
    } catch (e) { next(e); }
  });

  r.get('/settings', (_req, res) => res.json({ settings: getSettings(db) }));
  r.patch('/settings', requireRole('admin'), (req, res, next) => {
    try {
      const body = parse(z.object({ requireCallback: z.boolean(), segregationOfDuties: z.boolean(), autoAssign: z.boolean(), bankLetterMaxMonths: z.number().int().min(1).max(24), inviteValidDays: z.number().int().min(1).max(365), reminderAfterDays: z.number().int().min(1).max(60), slaReviewDays: z.number().int().min(1).max(30) }).partial(), req.body) as Partial<Settings>;
      res.json({ settings: patchSettings(db, body) });
    } catch (e) { next(e); }
  });

  r.get('/countries', (_req, res) => res.json({ rows: listCountryProfiles(db).map((p) => ({ ...p, tax: { ...p.tax, pattern: p.tax.pattern.source } })) }));
  r.put('/countries/:code', requireRole('admin'), (req, res, next) => {
    try {
      const code = req.params.code as Country;
      if (!COUNTRY_ORDER.includes(code)) throw notFound('Unknown country');
      const item = z.object({ id: z.string().regex(/^[a-z0-9-]{2,40}$/), label: z.string().min(1).max(80), labelAr: z.string().min(1).max(80), hint: z.string().max(200).optional(), hintAr: z.string().max(200).optional(), docType: z.string().min(1).max(40) });
      const body = parse(z.object({
        name: z.string().min(1), nameAr: z.string().min(1), flag: z.string().min(1), currency: z.string().length(3), ibanPrefix: z.string().length(2), registry: z.string().min(1), regLabel: z.string().min(1), regLabelAr: z.string().min(1), regExample: z.string(),
        tax: z.object({ applicable: z.boolean(), label: z.string(), labelAr: z.string(), authority: z.string(), pattern: z.string().min(1), format: z.string(), formatAr: z.string(), example: z.string() }),
        checklist: z.array(item).min(1).max(12), companyCode: z.string().min(1).max(10), bankLetterMaxMonths: z.number().int().min(1).max(24), notes: z.string().max(600),
      }), req.body);
      try { new RegExp(body.tax.pattern); } catch { throw unprocessable('Invalid tax pattern', { 'tax.pattern': 'Not a valid regular expression' }); }
      if (!body.checklist.some((c) => c.docType === 'bank-letter')) throw unprocessable('The checklist must include a bank letter', { checklist: 'Add a bank letter item' });
      const profile: CountryProfile = reviveProfile({ ...body, code });
      putCountryProfile(db, profile, displayName(req.user!));
      res.json({ profile: { ...profile, tax: { ...profile.tax, pattern: profile.tax.pattern.source } } });
    } catch (e) { next(e); }
  });

  r.get('/reports/export', (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const rows = wf.listRows(db, visible(req)).filter((v) => status === 'all' || (status === 'queue' ? ['submitted', 'in_review'].includes(v.status) : v.status === status));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="vendors-${status}.csv"`);
    res.send(toCsv(['Vendor', 'Email', 'Country', 'Category', 'Status', 'Invited', 'Submitted', 'Approved', 'Vendor code', 'Invited by', 'Assignee', 'Checks'], rows.map((v) => [v.name, v.email, v.country, v.category, v.status, v.invitedAt, v.submittedAt ?? '', v.approvedAt ?? '', v.vendorCode ?? '', v.invitedBy, v.assignee ?? '', v.summary.text])));
  });

  r.get('/notifications', (req, res) => res.json(wf.notifications(db, req.user!, visible(req), lastSeen.get(req.user!.id) ?? req.user!.lastLoginAt ?? '')));
  r.post('/notifications/seen', (req, res) => { lastSeen.set(req.user!.id, nowIso()); res.json({ ok: true }); });

  r.get('/demo/reset', (req, res, next) => {
    try {
      if (config.mode !== 'demo') throw forbidden('Reset is only available in demo mode');
      seedDemo(db);
      res.json({ ok: true, note: 'Demo data restored. Sign in again.' });
    } catch (e) { next(e); }
  });
  return r;
}
