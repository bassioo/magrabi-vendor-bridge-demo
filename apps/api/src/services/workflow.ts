// The onboarding workflow: invites, review transitions, decisions. Every state change writes to the audit trail.
import { COUNTRIES, COUNTRY_ORDER, checkSummaryText, reviewChecks, type Country, type Email, type ReviewSummary, type User, type Vendor } from '@vendorhub/shared';
import { config } from '../config.js';
import { addAudit, findOpenInviteByEmail, getCountryProfile, getInviteTokenEnc, getSettings, getVendor, insertVendor, listAudit, listDocuments, listRecentAudit, listRegistryChecks, listSapVendors, listVendors, setInviteToken, updateVendor, upsertSapVendor, type DB } from '../db/index.js';
import { decrypt, encrypt } from '../lib/crypto.js';
import { sha256 } from '../lib/hash.js';
import { randomToken, uuid } from '../lib/ids.js';
import { addDays, daysBetween, nowIso } from '../lib/time.js';
import { conflict, unprocessable } from '../lib/errors.js';
import { sendEmail, templates } from './email.js';
import { runPostSubmitChecks } from './registries.js';
import { displayName } from '../auth/index.js';

const EMPTY = { company: { regNumber: '', legalName: '', legalNameAr: '', regStatus: '', issueDate: '', expiryDate: '', city: '', address: '' }, tax: { vatNumber: '' }, bank: { iban: '', bankName: '', accountHolder: '' }, contacts: { sales: { name: '', email: '', phone: '' }, ar: { name: '', email: '', phone: '' } } };

export function summaryFor(db: DB, v: Vendor): ReviewSummary {
  const docs = listDocuments(db, v.id);
  const s = reviewChecks(v, docs, listRegistryChecks(db, v.id), listSapVendors(db), getSettings(db).bankLetterMaxMonths);
  // the checklist may have been edited by an admin: count documents against the stored profile, not the shipped default
  const slots = getCountryProfile(db, v.country).checklist;
  return { ...s, docsTotal: slots.length, docsPassed: slots.filter((sl) => docs.find((d) => d.slotId === sl.id)?.level === 'pass').length };
}

/** The vendor's current link, for staff screens. Undefined if the token cannot be recovered (e.g. secret rotated). */
export function currentInviteLink(db: DB, vendorId: string): string | undefined {
  const enc = getInviteTokenEnc(db, vendorId);
  const token = enc && decrypt(enc);
  return token ? vendorLinkFor(token) : undefined;
}

export function vendorLinkFor(token: string): string { return `${config.publicUrl}/v/${token}`; }

/** Creates (or reuses) an invite and emails the link. Returns the plain token once; only its hash is stored. */
export async function invite(db: DB, by: User, input: { email: string; country: Country; category: string; lang?: 'en' | 'ar' }): Promise<{ vendor: Vendor; token: string; reused: boolean }> {
  const settings = getSettings(db);
  const existing = findOpenInviteByEmail(db, input.email);
  const token = randomToken(32);
  if (existing) {
    setInviteToken(db, existing.id, sha256(token), encrypt(token), addDays(nowIso(), settings.inviteValidDays));
    const v = getVendor(db, existing.id)!;
    addAudit(db, v.id, displayName(by), 'review', `Invite link re-sent to ${v.email}`);
    await sendEmail(db, templates.invite(v, token, displayName(by)));
    return { vendor: v, token, reused: true };
  }
  const at = nowIso();
  const v: Vendor = { id: uuid(), email: input.email.toLowerCase(), country: input.country, category: input.category, status: 'invited', name: '', lang: input.lang ?? 'en', stage: 'welcome', formStep: 0, invitedBy: displayName(by), invitedAt: at, inviteExpiresAt: addDays(at, settings.inviteValidDays), returnCount: 0, bankIsNew: true, ...structuredClone(EMPTY) };
  insertVendor(db, v, sha256(token), encrypt(token));
  addAudit(db, v.id, displayName(by), 'review', `Invite sent to ${v.email} · ${COUNTRIES[v.country].name} · ${v.category}`);
  await sendEmail(db, templates.invite(v, token, displayName(by)));
  return { vendor: v, token, reused: false };
}

export async function resendInvite(db: DB, by: User, vendorId: string): Promise<string> {
  const v = getVendor(db, vendorId);
  if (!v) throw conflict('Vendor not found');
  if (!['invited', 'draft', 'expired', 'returned'].includes(v.status)) throw unprocessable('This vendor has already submitted; nothing to resend');
  const token = randomToken(32);
  const settings = getSettings(db);
  setInviteToken(db, v.id, sha256(token), encrypt(token), addDays(nowIso(), settings.inviteValidDays));
  if (v.status === 'expired') { v.status = v.company.regNumber ? 'draft' : 'invited'; updateVendor(db, v); }
  addAudit(db, v.id, displayName(by), 'review', `Invite link re-sent to ${v.email} · previous link invalidated`);
  await sendEmail(db, templates.invite(getVendor(db, v.id)!, token, displayName(by)));
  return token;
}

/** Vendor submits: validates completeness, moves to submitted, emails, and runs the registry checks in the background. */
export async function submit(db: DB, v: Vendor): Promise<Vendor> {
  const profile = COUNTRIES[v.country];
  const docs = listDocuments(db, v.id);
  const missing = profile.checklist.filter((s) => !docs.find((d) => d.slotId === s.id));
  if (missing.length) throw unprocessable('Some documents are missing', Object.fromEntries(missing.map((s) => [s.id, 'Required'])));
  const failed = docs.filter((d) => d.level === 'fail');
  if (failed.length) throw unprocessable('Some documents did not pass the checks', Object.fromEntries(failed.map((d) => [d.slotId, 'Please replace this document'])));
  if (!v.company.legalName || !v.company.regNumber || !v.bank.iban || !v.bank.accountHolder || !v.contacts.ar.email) throw unprocessable('The form is incomplete');
  const resubmit = v.status === 'returned' || v.returnCount > 0;
  v.status = 'submitted';
  v.stage = 'status';
  v.submittedAt = nowIso();
  v.name = v.company.legalName || v.name;
  if (v.firstTimeRight === undefined) v.firstTimeRight = true;
  updateVendor(db, v);
  addAudit(db, v.id, 'Vendor', 'system', resubmit ? 'Registration resubmitted' : 'Registration submitted');
  await sendEmail(db, templates.submitted(v));
  void runPostSubmitChecks(db, v.id).catch(() => undefined);
  return getVendor(db, v.id)!;
}

/** First open by staff: submitted → in_review, optional auto-assign. */
export function openForReview(db: DB, by: User, v: Vendor): Vendor {
  if (v.status !== 'submitted') return v;
  const s = getSettings(db);
  const assign = s.autoAssign && !v.assignee;
  v.status = 'in_review';
  v.reviewStartedAt = nowIso();
  if (assign) v.assignee = displayName(by);
  updateVendor(db, v);
  addAudit(db, v.id, displayName(by), 'review', assign ? `Opened for review · assigned to ${displayName(by)}` : 'Opened for review');
  return v;
}

export function assign(db: DB, by: User, v: Vendor, to: User): Vendor {
  v.assignee = displayName(to);
  updateVendor(db, v);
  addAudit(db, v.id, displayName(by), 'review', `Assigned to ${displayName(to)}`);
  return v;
}

export function confirmCallback(db: DB, by: User, v: Vendor, phone: string): Vendor {
  v.callbackConfirmedBy = displayName(by);
  v.callbackConfirmedAt = nowIso();
  updateVendor(db, v);
  addAudit(db, v.id, displayName(by), 'review', `Bank details confirmed by call-back to ${v.contacts.ar.name || v.email} on ${phone}`);
  return v;
}

/** Policy gate for approval. Returns the blocking reasons (empty = may approve). */
export function approvalBlockers(db: DB, by: User, v: Vendor): Record<string, string> {
  const s = getSettings(db);
  const blockers: Record<string, string> = {};
  if (!['in_review', 'submitted'].includes(v.status)) blockers.status = `Cannot approve a vendor in status "${v.status}"`;
  if (by.role === 'requester') blockers.role = 'Only approvers and admins can approve';
  if (s.segregationOfDuties && v.invitedBy === displayName(by)) blockers.sod = `${by.name} invited this vendor, so a different person must approve`;
  if (s.requireCallback && v.bankIsNew && !v.callbackConfirmedAt) blockers.callback = 'Bank details must be confirmed by call-back first';
  const summary = summaryFor(db, v);
  if (summary.fails > 0) blockers.checks = `${summary.fails} failed check${summary.fails === 1 ? '' : 's'} must be resolved first`;
  return blockers;
}

export async function approve(db: DB, by: User, v: Vendor): Promise<Vendor> {
  const blockers = approvalBlockers(db, by, v);
  if (Object.keys(blockers).length) throw unprocessable('Approval blocked by policy', blockers);
  v.status = 'approved';
  v.approvedAt = nowIso();
  v.approvedBy = displayName(by);
  if (v.firstTimeRight === undefined) v.firstTimeRight = v.returnCount === 0;
  updateVendor(db, v);
  addAudit(db, v.id, displayName(by), 'review', `Approved${v.callbackConfirmedAt ? ' · bank details confirmed by call-back' : ''}`, `Approver: ${displayName(by)} · Requester: ${v.invitedBy}`);
  await sendEmail(db, templates.approved(v));
  return v;
}

export async function returnToVendor(db: DB, by: User, v: Vendor, note: { en: string; ar: string; items: string[] }): Promise<Vendor> {
  if (!['in_review', 'submitted'].includes(v.status)) throw unprocessable(`Cannot return a vendor in status "${v.status}"`);
  v.status = 'returned';
  v.stage = 'status';
  v.returnCount += 1;
  v.firstTimeRight = false;
  v.returnNote = { ...note, sentAt: nowIso(), by: displayName(by) };
  updateVendor(db, v);
  addAudit(db, v.id, displayName(by), 'review', `Returned to vendor: ${note.items.join('; ') || 'see note'}`, 'Bilingual note sent');
  await sendEmail(db, templates.returned(v, note.en, note.ar));
  return v;
}

export async function reject(db: DB, by: User, v: Vendor, reason: string): Promise<Vendor> {
  if (by.role === 'requester') throw unprocessable('Only approvers and admins can reject');
  v.status = 'rejected';
  v.stage = 'status';
  updateVendor(db, v);
  addAudit(db, v.id, displayName(by), 'review', `Rejected: ${reason}`);
  await sendEmail(db, templates.rejected(v, reason));
  return v;
}

export async function issueCode(db: DB, by: User, v: Vendor, code: string): Promise<Vendor> {
  if (v.status !== 'approved') throw unprocessable('Approve the vendor before issuing a code');
  if (listSapVendors(db).some((s) => s.code === code)) throw conflict(`Vendor code ${code} already exists in the SAP list`);
  const at = nowIso();
  v.status = 'code_issued';
  v.codeIssuedAt = at;
  v.vendorCode = code;
  v.bankIsNew = false;
  updateVendor(db, v);
  upsertSapVendor(db, { code, name: v.company.legalName, nameAr: v.company.legalNameAr, country: v.country, regNumber: v.company.regNumber, vatNumber: v.tax.vatNumber, iban: v.bank.iban, createdAt: at.slice(0, 10), source: 'issued' });
  addAudit(db, v.id, displayName(by), 'system', `Vendor code ${code} issued · added to SAP vendor list · vendor notified`);
  await sendEmail(db, templates.codeIssued(v, code));
  return v;
}

/* ---------- lists & dashboard ---------- */
export type VendorListRow = Vendor & { summary: { text: string; level: 'pass' | 'flag' | 'fail' | 'pending' }; overdueDays?: number };

export function listRows(db: DB, visible: (v: Vendor) => boolean): VendorListRow[] {
  const s = getSettings(db);
  const sap = listSapVendors(db);
  return listVendors(db).filter(visible).map((v) => {
    const decided = v.status === 'approved' || v.status === 'code_issued';
    const submitted = !['invited', 'draft', 'expired'].includes(v.status);
    const summary = !submitted ? { text: '—', level: 'pending' as const } : decided ? { text: 'All checks passed', level: 'pass' as const } : v.status === 'returned' ? { text: v.returnNote?.items?.[0] ? `Returned: ${v.returnNote.items[0]}` : 'Returned to vendor', level: 'flag' as const } : v.status === 'rejected' ? { text: 'Rejected', level: 'fail' as const } : checkSummaryText(reviewChecks(v, listDocuments(db, v.id), listRegistryChecks(db, v.id), sap, s.bankLetterMaxMonths));
    const waiting = v.status === 'submitted' || v.status === 'in_review' ? daysBetween(v.submittedAt, nowIso()) : null;
    return { ...v, summary, overdueDays: waiting !== null && waiting > s.slaReviewDays ? Math.floor(waiting - s.slaReviewDays) : undefined };
  });
}

const avg = (xs: (number | null)[]) => { const n = xs.filter((x): x is number => x !== null); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; };

export function dashboard(db: DB, visible: (v: Vendor) => boolean) {
  const rows = listRows(db, visible);
  const queue = rows.filter((v) => v.status === 'submitted' || v.status === 'in_review');
  const issued = rows.filter((v) => v.status === 'code_issued');
  const reviewed = rows.filter((v) => v.firstTimeRight !== undefined && (v.status === 'approved' || v.status === 'code_issued' || v.status === 'returned' || v.returnCount > 0));
  const now = new Date();
  const returnedThisMonth = rows.filter((v) => listAudit(db, v.id).some((a) => a.message.startsWith('Returned to vendor') && new Date(a.at).getMonth() === now.getMonth() && new Date(a.at).getFullYear() === now.getFullYear())).length;
  const daysToCode = avg(issued.map((v) => daysBetween(v.invitedAt, v.codeIssuedAt)));
  const stages = [
    { stage: 'Invite → Submitted', days: avg(rows.map((v) => daysBetween(v.invitedAt, v.submittedAt))) },
    { stage: 'Submitted → Reviewed', days: avg(rows.map((v) => daysBetween(v.submittedAt, v.approvedAt))) },
    { stage: 'Reviewed → Code issued', days: avg(rows.map((v) => daysBetween(v.approvedAt, v.codeIssuedAt))) },
  ].map((x) => ({ ...x, days: x.days === null ? 0 : Math.round(x.days * 10) / 10 }));
  const byCountry = COUNTRY_ORDER.map((c) => ({ country: c, n: rows.filter((v) => v.country === c && !['invited', 'draft', 'expired'].includes(v.status)).length })).filter((x) => x.n > 0);
  const rank = (v: VendorListRow) => (v.overdueDays !== undefined ? 0 : v.summary.level === 'pass' ? 2 : 1);
  const attention = queue.sort((a, b) => rank(a) - rank(b) || (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''));
  const visibleIds = new Set(rows.map((r) => r.id));
  const activity = listRecentAudit(db, 60).filter((a) => visibleIds.has(a.vendorId) && (a.kind === 'review' || a.kind === 'system')).slice(0, 10);
  return {
    kpis: { inQueue: queue.length, newCount: queue.filter((v) => v.status === 'submitted').length, inReview: queue.filter((v) => v.status === 'in_review').length, avgDaysToCode: daysToCode === null ? null : Math.round(daysToCode * 10) / 10, firstTimeRightPct: reviewed.length ? Math.round((reviewed.filter((v) => v.firstTimeRight).length / reviewed.length) * 100) : null, firstTimeRightCount: reviewed.filter((v) => v.firstTimeRight).length, reviewedCount: reviewed.length, returnedThisMonth, overdue: queue.filter((v) => v.overdueDays !== undefined).length },
    stages, byCountry, attention, activity,
  };
}

export function notifications(db: DB, user: User, visible: (v: Vendor) => boolean, since: string) {
  const visibleIds = new Set(listVendors(db).filter(visible).map((v) => v.id));
  const rows = listRecentAudit(db, 80).filter((a) => visibleIds.has(a.vendorId) && (a.kind === 'system' || a.kind === 'review') && a.actor !== displayName(user)).slice(0, 15);
  return { rows, unread: rows.filter((a) => a.at > since).length };
}

export type { Email };
