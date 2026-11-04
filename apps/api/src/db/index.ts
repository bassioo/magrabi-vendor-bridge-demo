// SQLite access layer. One connection per process; repositories map rows to the shared domain types.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES, COUNTRY_ORDER, DEFAULT_SETTINGS, type AuditEntry, type Country, type CountryProfile, type DocumentRecord, type Email, type Note, type RegistryCheck, type SapVendor, type Settings, type User, type Vendor } from '@vendorhub/shared';
import { config } from '../config.js';
import { uuid } from '../lib/ids.js';
import { nowIso } from '../lib/time.js';

export type DB = Database.Database;

const here = path.dirname(fileURLToPath(import.meta.url));

export function openDatabase(dbPath = config.dbPath): DB {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  const schema = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  db.exec(schema);
  // additive migrations (SQLite has no IF NOT EXISTS for columns)
  const cols = (db.prepare('PRAGMA table_info(vendors)').all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes('invite_token_enc')) db.exec('ALTER TABLE vendors ADD COLUMN invite_token_enc TEXT');
  ensureDefaults(db);
  return db;
}

function ensureDefaults(db: DB): void {
  const get = db.prepare('SELECT value_json FROM settings WHERE key = ?');
  const put = db.prepare('INSERT OR IGNORE INTO settings (key, value_json) VALUES (?, ?)');
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) if (!get.get(k)) put.run(k, JSON.stringify(v));
  const cr = db.prepare('INSERT OR IGNORE INTO country_rules (country, profile_json, updated_at) VALUES (?, ?, ?)');
  for (const c of COUNTRY_ORDER) cr.run(c, JSON.stringify(serialiseProfile(COUNTRIES[c])), nowIso());
  // first admin
  const admin = db.prepare('SELECT id FROM users WHERE email = ?').get(config.adminEmail);
  if (!admin) db.prepare('INSERT INTO users (id, email, name, role, markets, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)').run(uuid(), config.adminEmail, config.adminName, 'admin', 'all', nowIso());
}

// Regexes in the tax rule are not JSON. Store them as source strings and revive on read.
export function serialiseProfile(p: CountryProfile): Record<string, unknown> {
  return { ...p, tax: { ...p.tax, pattern: p.tax.pattern.source } };
}
export function reviveProfile(raw: Record<string, unknown>): CountryProfile {
  const tax = raw.tax as Record<string, unknown>;
  return { ...(raw as unknown as CountryProfile), tax: { ...(tax as unknown as CountryProfile['tax']), pattern: new RegExp(String(tax.pattern), 'i') } };
}

/* ---------- settings & country rules ---------- */
export function getSettings(db: DB): Settings {
  const rows = db.prepare('SELECT key, value_json FROM settings').all() as { key: string; value_json: string }[];
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = JSON.parse(r.value_json);
  return s as unknown as Settings;
}
export function patchSettings(db: DB, patch: Partial<Settings>): Settings {
  const put = db.prepare('INSERT INTO settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json');
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) put.run(k, JSON.stringify(v));
  return getSettings(db);
}
export function getCountryProfile(db: DB, country: Country): CountryProfile {
  const row = db.prepare('SELECT profile_json FROM country_rules WHERE country = ?').get(country) as { profile_json: string } | undefined;
  return row ? reviveProfile(JSON.parse(row.profile_json)) : COUNTRIES[country];
}
export function listCountryProfiles(db: DB): CountryProfile[] {
  return COUNTRY_ORDER.map((c) => getCountryProfile(db, c));
}
export function putCountryProfile(db: DB, p: CountryProfile, by: string): void {
  db.prepare('INSERT INTO country_rules (country, profile_json, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(country) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at, updated_by = excluded.updated_by').run(p.code, JSON.stringify(serialiseProfile(p)), nowIso(), by);
}

/* ---------- users & sessions ---------- */
interface UserRow { id: string; email: string; name: string; role: User['role']; markets: string; active: number; created_at: string; last_login_at: string | null }
const toUser = (r: UserRow): User => ({ id: r.id, email: r.email, name: r.name, role: r.role, markets: r.markets === 'all' ? 'all' : (JSON.parse(r.markets) as Country[]), active: !!r.active, createdAt: r.created_at, lastLoginAt: r.last_login_at ?? undefined });
export function getUserByEmail(db: DB, email: string): User | undefined { const r = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined; return r && toUser(r); }
export function getUserById(db: DB, id: string): User | undefined { const r = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined; return r && toUser(r); }
export function listUsers(db: DB): User[] { return (db.prepare('SELECT * FROM users ORDER BY created_at').all() as UserRow[]).map(toUser); }
export function insertUser(db: DB, u: Omit<User, 'id' | 'createdAt' | 'active'> & { active?: boolean }): User {
  const id = uuid();
  db.prepare('INSERT INTO users (id, email, name, role, markets, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, u.email.toLowerCase(), u.name, u.role, u.markets === 'all' ? 'all' : JSON.stringify(u.markets), u.active === false ? 0 : 1, nowIso());
  return getUserById(db, id)!;
}
export function updateUser(db: DB, id: string, patch: Partial<Pick<User, 'name' | 'role' | 'markets' | 'active' | 'lastLoginAt'>>): User {
  const u = getUserById(db, id);
  if (!u) throw new Error('user not found');
  const next = { ...u, ...patch };
  db.prepare('UPDATE users SET name = ?, role = ?, markets = ?, active = ?, last_login_at = ? WHERE id = ?').run(next.name, next.role, next.markets === 'all' ? 'all' : JSON.stringify(next.markets), next.active ? 1 : 0, next.lastLoginAt ?? null, id);
  return getUserById(db, id)!;
}
export function insertSession(db: DB, tokenHash: string, userId: string, expiresAt: string): void { db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(tokenHash, userId, nowIso(), expiresAt); }
export function getSessionUser(db: DB, tokenHash: string): User | undefined {
  const r = db.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?').get(tokenHash) as { user_id: string; expires_at: string } | undefined;
  if (!r || r.expires_at < nowIso()) return undefined;
  const u = getUserById(db, r.user_id);
  return u && u.active ? u : undefined;
}
export function deleteSession(db: DB, tokenHash: string): void { db.prepare('DELETE FROM sessions WHERE id = ?').run(tokenHash); }
export function insertLoginToken(db: DB, tokenHash: string, email: string, expiresAt: string): void { db.prepare('INSERT INTO login_tokens (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)').run(tokenHash, email.toLowerCase(), nowIso(), expiresAt); }
export function consumeLoginToken(db: DB, tokenHash: string): string | undefined {
  const r = db.prepare('SELECT email, expires_at, used_at FROM login_tokens WHERE token_hash = ?').get(tokenHash) as { email: string; expires_at: string; used_at: string | null } | undefined;
  if (!r || r.used_at || r.expires_at < nowIso()) return undefined;
  db.prepare('UPDATE login_tokens SET used_at = ? WHERE token_hash = ?').run(nowIso(), tokenHash);
  return r.email;
}

/* ---------- vendors ---------- */
interface VendorRow {
  id: string; invite_token_hash: string; email: string; country: Country; category: string; status: Vendor['status']; name: string; lang: Vendor['lang']; stage: Vendor['stage']; form_step: number;
  invited_by: string; invited_at: string; invite_expires_at: string; submitted_at: string | null; review_started_at: string | null; approved_at: string | null; approved_by: string | null; code_issued_at: string | null; vendor_code: string | null; assignee: string | null;
  return_count: number; first_time_right: number | null; bank_is_new: number; callback_confirmed_by: string | null; callback_confirmed_at: string | null;
  company_json: string; tax_json: string; bank_json: string; contacts_json: string; return_note_json: string | null; last_reminder_at: string | null; updated_at: string;
}
const EMPTY_COMPANY = { regNumber: '', legalName: '', legalNameAr: '', regStatus: '', issueDate: '', expiryDate: '', city: '', address: '' };
const EMPTY_CONTACT = { name: '', email: '', phone: '' };
export function toVendor(r: VendorRow): Vendor {
  return {
    id: r.id, email: r.email, country: r.country, category: r.category, status: r.status, name: r.name, lang: r.lang, stage: r.stage, formStep: r.form_step,
    invitedBy: r.invited_by, invitedAt: r.invited_at, inviteExpiresAt: r.invite_expires_at, submittedAt: r.submitted_at ?? undefined, reviewStartedAt: r.review_started_at ?? undefined, approvedAt: r.approved_at ?? undefined, approvedBy: r.approved_by ?? undefined, codeIssuedAt: r.code_issued_at ?? undefined, vendorCode: r.vendor_code ?? undefined, assignee: r.assignee ?? undefined,
    returnCount: r.return_count, firstTimeRight: r.first_time_right === null ? undefined : !!r.first_time_right, bankIsNew: !!r.bank_is_new, callbackConfirmedBy: r.callback_confirmed_by ?? undefined, callbackConfirmedAt: r.callback_confirmed_at ?? undefined,
    company: { ...EMPTY_COMPANY, ...JSON.parse(r.company_json) }, tax: { vatNumber: '', ...JSON.parse(r.tax_json) }, bank: { iban: '', bankName: '', accountHolder: '', ...JSON.parse(r.bank_json) },
    contacts: { sales: { ...EMPTY_CONTACT }, ar: { ...EMPTY_CONTACT }, ...JSON.parse(r.contacts_json) }, returnNote: r.return_note_json ? JSON.parse(r.return_note_json) : undefined,
  };
}
export function getVendor(db: DB, id: string): Vendor | undefined { const r = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id) as VendorRow | undefined; return r && toVendor(r); }
export function getVendorByTokenHash(db: DB, hash: string): Vendor | undefined { const r = db.prepare('SELECT * FROM vendors WHERE invite_token_hash = ?').get(hash) as VendorRow | undefined; return r && toVendor(r); }
export function findOpenInviteByEmail(db: DB, email: string): Vendor | undefined { const r = db.prepare("SELECT * FROM vendors WHERE email = ? AND status IN ('invited','draft') ORDER BY invited_at DESC LIMIT 1").get(email.toLowerCase()) as VendorRow | undefined; return r && toVendor(r); }
export function listVendors(db: DB): Vendor[] { return (db.prepare('SELECT * FROM vendors ORDER BY COALESCE(submitted_at, invited_at) DESC').all() as VendorRow[]).map(toVendor); }
export function getLastReminderAt(db: DB, id: string): string | undefined { const r = db.prepare('SELECT last_reminder_at FROM vendors WHERE id = ?').get(id) as { last_reminder_at: string | null } | undefined; return r?.last_reminder_at ?? undefined; }
export function setLastReminderAt(db: DB, id: string, at: string): void { db.prepare('UPDATE vendors SET last_reminder_at = ? WHERE id = ?').run(at, id); }

export function insertVendor(db: DB, v: Vendor, inviteTokenHash: string, inviteTokenEnc?: string): void {
  db.prepare(`INSERT INTO vendors (id, invite_token_hash, invite_token_enc, email, country, category, status, name, lang, stage, form_step, invited_by, invited_at, invite_expires_at, submitted_at, review_started_at, approved_at, approved_by, code_issued_at, vendor_code, assignee, return_count, first_time_right, bank_is_new, callback_confirmed_by, callback_confirmed_at, company_json, tax_json, bank_json, contacts_json, return_note_json, updated_at)
    VALUES (@id, @invite_token_hash, @invite_token_enc, @email, @country, @category, @status, @name, @lang, @stage, @form_step, @invited_by, @invited_at, @invite_expires_at, @submitted_at, @review_started_at, @approved_at, @approved_by, @code_issued_at, @vendor_code, @assignee, @return_count, @first_time_right, @bank_is_new, @callback_confirmed_by, @callback_confirmed_at, @company_json, @tax_json, @bank_json, @contacts_json, @return_note_json, @updated_at)`).run(vendorParams(v, inviteTokenHash, inviteTokenEnc));
}
export function updateVendor(db: DB, v: Vendor): void {
  db.prepare(`UPDATE vendors SET email=@email, country=@country, category=@category, status=@status, name=@name, lang=@lang, stage=@stage, form_step=@form_step, invited_by=@invited_by, invited_at=@invited_at, invite_expires_at=@invite_expires_at, submitted_at=@submitted_at, review_started_at=@review_started_at, approved_at=@approved_at, approved_by=@approved_by, code_issued_at=@code_issued_at, vendor_code=@vendor_code, assignee=@assignee, return_count=@return_count, first_time_right=@first_time_right, bank_is_new=@bank_is_new, callback_confirmed_by=@callback_confirmed_by, callback_confirmed_at=@callback_confirmed_at, company_json=@company_json, tax_json=@tax_json, bank_json=@bank_json, contacts_json=@contacts_json, return_note_json=@return_note_json, updated_at=@updated_at WHERE id=@id`).run(vendorParams(v, '', undefined));
}
export function setInviteToken(db: DB, id: string, hash: string, enc: string, expiresAt: string): void { db.prepare('UPDATE vendors SET invite_token_hash = ?, invite_token_enc = ?, invite_expires_at = ? WHERE id = ?').run(hash, enc, expiresAt, id); }
export function getInviteTokenEnc(db: DB, id: string): string | undefined { const r = db.prepare('SELECT invite_token_enc FROM vendors WHERE id = ?').get(id) as { invite_token_enc: string | null } | undefined; return r?.invite_token_enc ?? undefined; }
function vendorParams(v: Vendor, inviteTokenHash: string, inviteTokenEnc?: string) {
  return {
    id: v.id, invite_token_hash: inviteTokenHash, invite_token_enc: inviteTokenEnc ?? null, email: v.email.toLowerCase(), country: v.country, category: v.category, status: v.status, name: v.name, lang: v.lang, stage: v.stage, form_step: v.formStep,
    invited_by: v.invitedBy, invited_at: v.invitedAt, invite_expires_at: v.inviteExpiresAt, submitted_at: v.submittedAt ?? null, review_started_at: v.reviewStartedAt ?? null, approved_at: v.approvedAt ?? null, approved_by: v.approvedBy ?? null, code_issued_at: v.codeIssuedAt ?? null, vendor_code: v.vendorCode ?? null, assignee: v.assignee ?? null,
    return_count: v.returnCount, first_time_right: v.firstTimeRight === undefined ? null : v.firstTimeRight ? 1 : 0, bank_is_new: v.bankIsNew ? 1 : 0, callback_confirmed_by: v.callbackConfirmedBy ?? null, callback_confirmed_at: v.callbackConfirmedAt ?? null,
    company_json: JSON.stringify(v.company), tax_json: JSON.stringify(v.tax), bank_json: JSON.stringify(v.bank), contacts_json: JSON.stringify(v.contacts), return_note_json: v.returnNote ? JSON.stringify(v.returnNote) : null, updated_at: nowIso(),
  };
}

/* ---------- documents ---------- */
interface DocRow { id: string; vendor_id: string; slot_id: string; file_name: string; mime_type: string; size_bytes: number; storage_key: string; uploaded_at: string; extracted_json: string; extraction_source: DocumentRecord['extractionSource']; extraction_model: string | null; checks_json: string; level: DocumentRecord['level']; version: number; current: number }
const toDoc = (r: DocRow): DocumentRecord => ({ id: r.id, vendorId: r.vendor_id, slotId: r.slot_id, fileName: r.file_name, mimeType: r.mime_type, sizeBytes: r.size_bytes, storageKey: r.storage_key, uploadedAt: r.uploaded_at, extracted: JSON.parse(r.extracted_json), extractionSource: r.extraction_source, extractionModel: r.extraction_model ?? undefined, checks: JSON.parse(r.checks_json), level: r.level, version: r.version });
export function listDocuments(db: DB, vendorId: string): DocumentRecord[] { return (db.prepare('SELECT * FROM documents WHERE vendor_id = ? AND current = 1 ORDER BY uploaded_at').all(vendorId) as DocRow[]).map(toDoc); }
export function getDocument(db: DB, id: string): DocumentRecord | undefined { const r = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocRow | undefined; return r && toDoc(r); }
export function insertDocument(db: DB, d: Omit<DocumentRecord, 'id' | 'version'>): DocumentRecord {
  const prev = db.prepare('SELECT MAX(version) v FROM documents WHERE vendor_id = ? AND slot_id = ?').get(d.vendorId, d.slotId) as { v: number | null };
  db.prepare('UPDATE documents SET current = 0 WHERE vendor_id = ? AND slot_id = ?').run(d.vendorId, d.slotId);
  const id = uuid();
  db.prepare('INSERT INTO documents (id, vendor_id, slot_id, file_name, mime_type, size_bytes, storage_key, uploaded_at, extracted_json, extraction_source, extraction_model, checks_json, level, version, current) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)')
    .run(id, d.vendorId, d.slotId, d.fileName, d.mimeType, d.sizeBytes, d.storageKey, d.uploadedAt, JSON.stringify(d.extracted), d.extractionSource, d.extractionModel ?? null, JSON.stringify(d.checks), d.level, (prev.v ?? 0) + 1);
  return getDocument(db, id)!;
}
export function removeCurrentDocument(db: DB, vendorId: string, slotId: string): void { db.prepare('UPDATE documents SET current = 0 WHERE vendor_id = ? AND slot_id = ?').run(vendorId, slotId); }

/* ---------- audit, notes, registry checks ---------- */
export function addAudit(db: DB, vendorId: string, actor: string, kind: AuditEntry['kind'], message: string, detail?: string, at = nowIso()): AuditEntry {
  const e: AuditEntry = { id: uuid(), vendorId, at, actor, kind, message, detail };
  db.prepare('INSERT INTO audit (id, vendor_id, at, actor, kind, message, detail) VALUES (?, ?, ?, ?, ?, ?, ?)').run(e.id, vendorId, at, actor, kind, message, detail ?? null);
  return e;
}
interface AuditRow { id: string; vendor_id: string; at: string; actor: string; kind: AuditEntry['kind']; message: string; detail: string | null }
const toAudit = (r: AuditRow): AuditEntry => ({ id: r.id, vendorId: r.vendor_id, at: r.at, actor: r.actor, kind: r.kind, message: r.message, detail: r.detail ?? undefined });
export function listAudit(db: DB, vendorId: string): AuditEntry[] { return (db.prepare('SELECT * FROM audit WHERE vendor_id = ? ORDER BY at').all(vendorId) as AuditRow[]).map(toAudit); }
export function listRecentAudit(db: DB, limit = 50): (AuditEntry & { vendorName: string; vendorStatus: Vendor['status'] })[] {
  return (db.prepare('SELECT a.*, v.name AS vendor_name, v.email AS vendor_email, v.status AS vendor_status FROM audit a JOIN vendors v ON v.id = a.vendor_id ORDER BY a.at DESC LIMIT ?').all(limit) as (AuditRow & { vendor_name: string; vendor_email: string; vendor_status: Vendor['status'] })[])
    .map((r) => ({ ...toAudit(r), vendorName: r.vendor_name || r.vendor_email, vendorStatus: r.vendor_status }));
}
export function addNote(db: DB, vendorId: string, by: string, text: string, at = nowIso()): Note {
  const n: Note = { id: uuid(), vendorId, at, by, text };
  db.prepare('INSERT INTO notes (id, vendor_id, at, by, text) VALUES (?, ?, ?, ?, ?)').run(n.id, vendorId, at, by, text);
  return n;
}
export function listNotes(db: DB, vendorId: string): Note[] { return (db.prepare('SELECT id, vendor_id AS vendorId, at, by, text FROM notes WHERE vendor_id = ? ORDER BY at').all(vendorId) as Note[]); }
export function putRegistryCheck(db: DB, c: Omit<RegistryCheck, 'id'>): RegistryCheck {
  db.prepare('DELETE FROM registry_checks WHERE vendor_id = ? AND kind = ?').run(c.vendorId, c.kind);
  const id = uuid();
  db.prepare('INSERT INTO registry_checks (id, vendor_id, kind, provider, status, summary, detail, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, c.vendorId, c.kind, c.provider, c.status, c.summary, c.detail ?? null, c.checkedAt);
  return { id, ...c };
}
export function listRegistryChecks(db: DB, vendorId: string): RegistryCheck[] {
  return (db.prepare('SELECT id, vendor_id AS vendorId, kind, provider, status, summary, detail, checked_at AS checkedAt FROM registry_checks WHERE vendor_id = ?').all(vendorId) as (RegistryCheck & { detail: string | null })[]).map((r) => ({ ...r, detail: r.detail ?? undefined }));
}

/* ---------- SAP vendors & emails ---------- */
interface SapRow { code: string; name: string; name_ar: string | null; country: Country; reg_number: string; vat_number: string; iban: string; created_at: string; source: SapVendor['source'] }
const toSap = (r: SapRow): SapVendor => ({ code: r.code, name: r.name, nameAr: r.name_ar ?? undefined, country: r.country, regNumber: r.reg_number, vatNumber: r.vat_number, iban: r.iban, createdAt: r.created_at, source: r.source });
export function listSapVendors(db: DB): SapVendor[] { return (db.prepare('SELECT * FROM sap_vendors ORDER BY created_at DESC').all() as SapRow[]).map(toSap); }
export function upsertSapVendor(db: DB, s: SapVendor): void {
  db.prepare('INSERT INTO sap_vendors (code, name, name_ar, country, reg_number, vat_number, iban, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET name=excluded.name, name_ar=excluded.name_ar, country=excluded.country, reg_number=excluded.reg_number, vat_number=excluded.vat_number, iban=excluded.iban, source=excluded.source').run(s.code, s.name, s.nameAr ?? null, s.country, s.regNumber, s.vatNumber, s.iban, s.createdAt, s.source);
}
export function insertEmail(db: DB, e: Email): void {
  db.prepare('INSERT INTO emails (id, at, to_email, vendor_id, kind, subject, body_en, body_ar, delivery, delivered_at, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(e.id, e.at, e.to, e.vendorId ?? null, e.kind, e.subject, e.bodyEn, e.bodyAr, e.delivery, e.deliveredAt ?? null, e.error ?? null);
}
interface EmailRow { id: string; at: string; to_email: string; vendor_id: string | null; kind: Email['kind']; subject: string; body_en: string; body_ar: string; delivery: Email['delivery']; delivered_at: string | null; error: string | null }
const toEmail = (r: EmailRow): Email => ({ id: r.id, at: r.at, to: r.to_email, vendorId: r.vendor_id ?? undefined, kind: r.kind, subject: r.subject, bodyEn: r.body_en, bodyAr: r.body_ar, delivery: r.delivery, deliveredAt: r.delivered_at ?? undefined, error: r.error ?? undefined });
export function listEmails(db: DB, vendorId?: string): Email[] {
  const rows = vendorId ? db.prepare('SELECT * FROM emails WHERE vendor_id = ? ORDER BY at DESC').all(vendorId) : db.prepare('SELECT * FROM emails ORDER BY at DESC LIMIT 500').all();
  return (rows as EmailRow[]).map(toEmail);
}
export function findLatestEmail(db: DB, kind: Email['kind'], to: string): Email | undefined { const r = db.prepare('SELECT * FROM emails WHERE kind = ? AND to_email = ? ORDER BY at DESC LIMIT 1').get(kind, to.toLowerCase()) as EmailRow | undefined; return r && toEmail(r); }

/** Demo reset: wipe everything except settings/country rules, then the caller reseeds. */
export function wipeData(db: DB): void {
  db.exec('DELETE FROM documents; DELETE FROM registry_checks; DELETE FROM audit; DELETE FROM notes; DELETE FROM emails; DELETE FROM vendors; DELETE FROM sap_vendors; DELETE FROM sessions; DELETE FROM login_tokens; DELETE FROM users;');
  ensureDefaults(db);
}
