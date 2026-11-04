// Demo seed: the sample stories from the demo, now as database rows. Run with `npm run seed` or via /api/staff/demo/reset.
import path from 'node:path';
import { COUNTRIES, makeIban, runDocChecks, worstLevel, type Country, type Vendor } from '@vendorhub/shared';
import { config } from '../config.js';
import { addAudit, addNote, getUserByEmail, insertDocument, insertEmail, insertUser, insertVendor, openDatabase, putRegistryCheck, updateVendor, upsertSapVendor, wipeData, type DB } from './index.js';
import { SAMPLE_COMPANIES, SAP_VENDORS, sampleForCountry, type SampleCompany } from '../services/demoData.js';
import { defaultSampleKey, SAMPLE_DOCS, toExtraction } from '../services/demoCatalogue.js';
import { sha256 } from '../lib/hash.js';
import { uuid } from '../lib/ids.js';
import { addDays, daysAgo, nowIso } from '../lib/time.js';
import { templates } from '../services/email.js';
import { encrypt } from '../lib/crypto.js';

const DEENA = 'Deena';
const HANA = 'Hana';
const SYSTEM = 'System';
/** Fixed demo invite tokens so links in docs and tests stay stable. Only their hashes are stored. */
export const DEMO_TOKENS = { alnoor: 'demo-alnoor-7f3k', jeddah: 'demo-jeddah-x9p2', bright: 'demo-bright-q9d2', nile: 'demo-nile-m4x8', manama: 'demo-manama-k2p7' } as const;
export const DEMO_USERS = [
  { email: 'deena@magrabi.example', name: 'Deena', role: 'approver' as const, markets: 'all' as const },
  { email: 'hana@magrabi.example', name: 'Hana', role: 'requester' as const, markets: 'all' as const },
  { email: 'omar@magrabi.example', name: 'Omar', role: 'approver' as const, markets: ['EG'] as Country[] },
  { email: 'sara@magrabi.example', name: 'Sara', role: 'requester' as const, markets: ['KW', 'QA', 'BH', 'OM'] as Country[] },
  { email: 'admin@magrabi.example', name: 'Admin', role: 'admin' as const, markets: 'all' as const },
];

const EMPTY = { company: { regNumber: '', legalName: '', legalNameAr: '', regStatus: '', issueDate: '', expiryDate: '', city: '', address: '' }, tax: { vatNumber: '' }, bank: { iban: '', bankName: '', accountHolder: '' }, contacts: { sales: { name: '', email: '', phone: '' }, ar: { name: '', email: '', phone: '' } } };

function base(p: Partial<Vendor> & Pick<Vendor, 'id' | 'email' | 'country' | 'category' | 'invitedAt'>): Vendor {
  return { name: '', status: 'invited', lang: 'en', stage: 'welcome', formStep: 0, invitedBy: HANA, inviteExpiresAt: addDays(p.invitedAt, 30), returnCount: 0, bankIsNew: true, ...structuredClone(EMPTY), ...p };
}
function fromSample(s: SampleCompany, id: string, extra: Partial<Vendor>): Vendor {
  return base({ id, email: s.email, country: s.country, category: s.category, invitedAt: daysAgo(3), name: s.company.legalName, company: { ...s.company, verifiedBy: COUNTRIES[s.country].registry, verifiedAt: daysAgo(2) }, tax: { ...s.tax }, bank: { ...s.bank }, contacts: structuredClone(s.contacts), ...extra });
}
function seedDocs(db: DB, v: Vendor, s: SampleCompany, at: string, overrides: Record<string, string> = {}): void {
  for (const slot of COUNTRIES[v.country].checklist) {
    const key = overrides[slot.id] ?? defaultSampleKey(s.key, slot.id);
    const sample = SAMPLE_DOCS[key];
    const r = toExtraction(sample, v, s);
    const checks = runDocChecks(slot, r, 6, at);
    insertDocument(db, { vendorId: v.id, slotId: slot.id, fileName: `${slot.id}.png`, mimeType: 'image/png', sizeBytes: 180_000, storageKey: path.join('samples', `${key}.png`), uploadedAt: at, extracted: r.fields, extractionSource: 'demo', extractionModel: 'Demo recognition v1', checks, level: worstLevel(checks.map((c) => c.level)) });
  }
}
function histBban(country: Country, i: number): string {
  const n = (s: number) => (10 ** s + i * 7919).toString().slice(-s);
  switch (country) { case 'KSA': return `20${n(18)}`; case 'UAE': return `026${n(16)}`; case 'EG': return `0019${n(4)}${n(17)}`; case 'KW': return `HIST${n(22)}`; case 'QA': return `HIST${n(21)}`; case 'BH': return `HIST${n(14)}`; case 'OM': return `012${n(16)}`; }
}
function historical(db: DB, i: number, name: string, nameAr: string, country: Country, category: string, inviteDays: number, submitDays: number, reviewDays: number, codeDays: number | null, opts: { returned?: boolean; status?: Vendor['status'] } = {}): Vendor {
  const regNumber = country === 'KSA' ? `10109${(10000 + i * 731).toString().slice(-5)}` : country === 'UAE' ? `CN-9${(100000 + i * 4321).toString().slice(-6)}` : country === 'EG' ? `9${(1000 + i * 97).toString().slice(-4)}` : `${500000 + i * 7919}`;
  const vat = country === 'KSA' ? `3009${(1000000000 + i * 12345).toString().slice(-10)}3` : country === 'UAE' ? `1009${(100000000 + i * 54321).toString().slice(-11)}` : country === 'EG' ? `9${(10 + i).toString().slice(-2)}-${(100 + i * 7).toString().slice(-3)}-${(100 + i * 13).toString().slice(-3)}` : country === 'BH' ? `2009${(10000000000 + i * 777).toString().slice(-11)}` : country === 'OM' ? `OM11000${(10000 + i * 31).toString().slice(-5)}` : '';
  const status: Vendor['status'] = opts.status ?? (codeDays !== null ? 'code_issued' : 'approved');
  const v = base({ id: `v-hist-${i}`, email: `accounts@${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`, country, category, invitedAt: daysAgo(inviteDays), invitedBy: i % 2 ? HANA : DEENA, name, status, stage: 'status', submittedAt: daysAgo(submitDays), reviewStartedAt: daysAgo(reviewDays, 6), approvedAt: status === 'returned' ? undefined : daysAgo(reviewDays), approvedBy: status === 'returned' ? undefined : i % 2 ? DEENA : HANA, codeIssuedAt: codeDays !== null ? daysAgo(codeDays) : undefined, vendorCode: codeDays !== null ? `4002${10 + i}` : undefined, firstTimeRight: !opts.returned, returnCount: opts.returned ? 1 : 0, bankIsNew: false,
    company: { regNumber, legalName: name, legalNameAr: nameAr, regStatus: 'Active', issueDate: '2022-02-01', expiryDate: '2028-01-31', city: sampleForCountry(country).company.city, address: 'Sample address', verifiedBy: COUNTRIES[country].registry }, tax: { vatNumber: vat }, bank: { iban: makeIban(COUNTRIES[country].ibanPrefix, histBban(country, i)), bankName: 'Sample Bank', accountHolder: name }, contacts: { sales: { name: 'Sales contact', email: `sales@${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`, phone: '+000' }, ar: { name: 'Accounts contact', email: `accounts@${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`, phone: '+000' } } });
  insertVendor(db, v, sha256(`demo-hist-${i}`), encrypt(`demo-hist-${i}`));
  addAudit(db, v.id, v.invitedBy, 'review', `Invite sent to ${v.email}`, undefined, v.invitedAt);
  addAudit(db, v.id, 'Vendor', 'system', 'Registration submitted', undefined, v.submittedAt);
  if (opts.returned) { addAudit(db, v.id, DEENA, 'review', 'Returned to vendor: bank letter older than 6 months', undefined, daysAgo(reviewDays + 1)); addAudit(db, v.id, 'Vendor', 'upload', 'Resubmitted with a new bank letter', undefined, daysAgo(reviewDays, 12)); }
  if (v.approvedAt) addAudit(db, v.id, v.approvedBy!, 'review', 'Approved · bank details confirmed by call-back', undefined, v.approvedAt);
  if (v.codeIssuedAt) addAudit(db, v.id, v.approvedBy!, 'system', `Vendor code ${v.vendorCode} issued · vendor notified`, undefined, v.codeIssuedAt);
  for (const kind of ['company', 'tax', 'duplicate', 'sanctions'] as const) putRegistryCheck(db, { vendorId: v.id, kind, provider: kind === 'duplicate' ? 'sap-list' : 'simulated', status: 'pass', summary: kind === 'company' ? `${COUNTRIES[country].registry} (simulated): ${regNumber} active` : kind === 'tax' ? `${COUNTRIES[country].tax.authority}: ${vat || 'no VAT regime'}` : kind === 'duplicate' ? 'No match in SAP vendor list' : 'Clear (simulated)', checkedAt: v.submittedAt! });
  return v;
}

export function seedDemo(db: DB): void {
  wipeData(db);
  for (const u of DEMO_USERS) if (!getUserByEmail(db, u.email)) insertUser(db, u);
  for (const s of SAP_VENDORS) upsertSapVendor(db, s);

  const A = SAMPLE_COMPANIES.alnoor, J = SAMPLE_COMPANIES.jeddah, B = SAMPLE_COMPANIES.bright, N = SAMPLE_COMPANIES.nile, M = SAMPLE_COMPANIES.bh;

  // 1. Al Noor — invited, the live run.
  const alnoor = base({ id: 'v-alnoor', email: A.email, country: 'KSA', category: A.category, invitedAt: daysAgo(0, 2) });
  insertVendor(db, alnoor, sha256(DEMO_TOKENS.alnoor), encrypt(DEMO_TOKENS.alnoor));
  addAudit(db, alnoor.id, HANA, 'review', `Invite sent to ${A.email} · Saudi Arabia · ${A.category}`, undefined, alnoor.invitedAt);
  insertEmail(db, { id: uuid(), at: alnoor.invitedAt, delivery: 'outbox', ...templates.invite(alnoor, DEMO_TOKENS.alnoor, HANA) });

  // 1b. Jeddah — second invite for a second live run.
  const jeddah = base({ id: 'v-jeddah', email: J.email, country: 'KSA', category: J.category, invitedAt: daysAgo(0, 1) });
  insertVendor(db, jeddah, sha256(DEMO_TOKENS.jeddah), encrypt(DEMO_TOKENS.jeddah));
  addAudit(db, jeddah.id, HANA, 'review', `Invite sent to ${J.email} · Saudi Arabia · ${J.category}`, undefined, jeddah.invitedAt);
  insertEmail(db, { id: uuid(), at: jeddah.invitedAt, delivery: 'outbox', ...templates.invite(jeddah, DEMO_TOKENS.jeddah, HANA) });

  // 2. Bright Display — caught at upload (old bank letter), fixed, in review with everything green.
  const bright = fromSample(B, 'v-bright', { status: 'in_review', stage: 'status', invitedAt: daysAgo(4), submittedAt: daysAgo(1, 3), reviewStartedAt: daysAgo(0, 1), assignee: DEENA });
  insertVendor(db, bright, sha256(DEMO_TOKENS.bright), encrypt(DEMO_TOKENS.bright));
  seedDocs(db, bright, B, daysAgo(1, 4));
  for (const [at, actor, kind, msg, detail] of [
    [daysAgo(4), HANA, 'review', `Invite sent to ${B.email} · United Arab Emirates · ${B.category}`], [daysAgo(2, 5), 'Vendor', 'system', 'Form saved · steps 1–4 complete'], [daysAgo(2, 5), SYSTEM, 'rule', 'IBAN checksum valid (mod-97)', B.bank.iban],
    [daysAgo(1, 6), 'Vendor', 'upload', 'Uploaded bank letter · bank-letter-feb.pdf'], [daysAgo(1, 6), SYSTEM, 'ai', 'Demo recognition v1: read bank letter · IBAN, account holder, issue date', 'Issue date 8 months ago'], [daysAgo(1, 6), SYSTEM, 'rule', 'Bank letter FAILED the 6-month rule · vendor told instantly', 'This bank letter is dated 8 months ago. Please upload one issued within the last 6 months.'],
    [daysAgo(1, 5), 'Vendor', 'upload', 'Replaced bank letter · bank-letter-oct.pdf'], [daysAgo(1, 5), SYSTEM, 'ai', 'Demo recognition v1: read bank letter · IBAN matches form', 'Issue date 6 days ago'], [daysAgo(1, 5), SYSTEM, 'rule', 'Bank letter passed the 6-month rule'],
    [daysAgo(1, 4), 'Vendor', 'upload', 'Uploaded trade licence, TRN certificate, signed quotation · all checks passed'], [daysAgo(1, 3), 'Vendor', 'system', 'Registration submitted'],
    [daysAgo(1, 3), SYSTEM, 'registry', 'DED (simulated): licence CN-7654321 active, expires 2027-01-09'], [daysAgo(1, 3), SYSTEM, 'registry', 'FTA (simulated): TRN 100765432100003 active'], [daysAgo(1, 3), SYSTEM, 'rule', 'Duplicate check: no match in SAP vendor list (15 vendors)'], [daysAgo(1, 3), SYSTEM, 'registry', 'Sanctions screen: clear (simulated)'], [daysAgo(0, 1), DEENA, 'review', 'Opened for review · assigned to Deena'],
  ] as [string, string, Parameters<typeof addAudit>[3], string, string?][]) addAudit(db, bright.id, actor, kind, msg, detail, at);
  putRegistryCheck(db, { vendorId: bright.id, kind: 'company', provider: 'simulated', status: 'pass', summary: 'DED (simulated): CN-7654321 active, expires 2027-01-09', checkedAt: daysAgo(1, 3) });
  putRegistryCheck(db, { vendorId: bright.id, kind: 'tax', provider: 'simulated', status: 'pass', summary: 'FTA (simulated): 100765432100003 active', checkedAt: daysAgo(1, 3) });
  putRegistryCheck(db, { vendorId: bright.id, kind: 'duplicate', provider: 'sap-list', status: 'pass', summary: 'No match in SAP vendor list (15 vendors)', checkedAt: daysAgo(1, 3) });
  putRegistryCheck(db, { vendorId: bright.id, kind: 'sanctions', provider: 'simulated', status: 'pass', summary: 'Clear · UN, OFAC, EU and local lists (simulated)', checkedAt: daysAgo(1, 3) });
  insertEmail(db, { id: uuid(), at: bright.submittedAt!, delivery: 'outbox', ...templates.submitted(bright) });

  // 3. Nile Gifts — caught in review: tax registration already in SAP as 400112.
  const nile = fromSample(N, 'v-nile', { status: 'in_review', stage: 'status', invitedAt: daysAgo(5), submittedAt: daysAgo(2, 2), reviewStartedAt: daysAgo(0, 3), assignee: DEENA });
  insertVendor(db, nile, sha256(DEMO_TOKENS.nile), encrypt(DEMO_TOKENS.nile));
  seedDocs(db, nile, N, daysAgo(2, 3));
  for (const [at, actor, kind, msg, detail] of [
    [daysAgo(5), HANA, 'review', `Invite sent to ${N.email} · Egypt · ${N.category}`], [daysAgo(3), 'Vendor', 'system', 'Form saved · steps 1–4 complete'], [daysAgo(3), SYSTEM, 'rule', 'IBAN checksum valid (mod-97)', N.bank.iban],
    [daysAgo(2, 3), 'Vendor', 'upload', 'Uploaded 6 documents · all checks passed'], [daysAgo(2, 3), SYSTEM, 'ai', 'Demo recognition v1: read 6 documents · names consistent across documents'], [daysAgo(2, 2), 'Vendor', 'system', 'Registration submitted'],
    [daysAgo(2, 2), SYSTEM, 'registry', 'GAFI (simulated): register 76598 active'], [daysAgo(2, 2), SYSTEM, 'registry', 'ETA (simulated): tax registration 345-678-912 active'], [daysAgo(2, 2), SYSTEM, 'rule', 'Duplicate check: FLAG · SAP vendor 400112 "Nile Gifts and Promotional Items" shares tax registration 345-678-912', 'Matched on: tax registration, normalised name'], [daysAgo(2, 2), SYSTEM, 'registry', 'Sanctions screen: clear (simulated)'], [daysAgo(0, 3), DEENA, 'review', 'Opened for review · assigned to Deena'],
  ] as [string, string, Parameters<typeof addAudit>[3], string, string?][]) addAudit(db, nile.id, actor, kind, msg, detail, at);
  putRegistryCheck(db, { vendorId: nile.id, kind: 'company', provider: 'simulated', status: 'pass', summary: 'GAFI (simulated): 76598 active, expires 2029-05-31', checkedAt: daysAgo(2, 2) });
  putRegistryCheck(db, { vendorId: nile.id, kind: 'tax', provider: 'simulated', status: 'pass', summary: 'ETA (simulated): 345-678-912 active', checkedAt: daysAgo(2, 2) });
  putRegistryCheck(db, { vendorId: nile.id, kind: 'duplicate', provider: 'sap-list', status: 'flag', summary: 'Possible match: SAP vendor 400112 "Nile Gifts and Promotional Items" · same tax registration and normalised name', detail: '["vat","name"]', checkedAt: daysAgo(2, 2) });
  putRegistryCheck(db, { vendorId: nile.id, kind: 'sanctions', provider: 'simulated', status: 'pass', summary: 'Clear · UN, OFAC, EU and local lists (simulated)', checkedAt: daysAgo(2, 2) });
  addNote(db, nile.id, DEENA, 'Looks like the same company as 400112 (renamed in 2024?). Asking the vendor for their existing code before we create a second account.', daysAgo(0, 3));
  insertEmail(db, { id: uuid(), at: nile.submittedAt!, delivery: 'outbox', ...templates.submitted(nile) });

  // 4. Manama — just submitted, clean, unassigned.
  const manama = fromSample(M, 'v-manama', { status: 'submitted', stage: 'status', invitedAt: daysAgo(2), submittedAt: daysAgo(0, 5) });
  insertVendor(db, manama, sha256(DEMO_TOKENS.manama), encrypt(DEMO_TOKENS.manama));
  seedDocs(db, manama, M, daysAgo(0, 6));
  for (const [at, actor, kind, msg] of [[daysAgo(2), HANA, 'review', `Invite sent to ${M.email} · Bahrain · ${M.category}`], [daysAgo(0, 7), 'Vendor', 'system', 'Form saved · steps 1–4 complete'], [daysAgo(0, 6), 'Vendor', 'upload', 'Uploaded 4 documents · all checks passed'], [daysAgo(0, 5), 'Vendor', 'system', 'Registration submitted'], [daysAgo(0, 5), SYSTEM, 'registry', 'Sijilat (simulated): CR 98765-1 active, expires 2026-11-29'], [daysAgo(0, 5), SYSTEM, 'registry', 'NBR (simulated): VAT account 200012345600002 active'], [daysAgo(0, 5), SYSTEM, 'rule', 'Duplicate check: no match in SAP vendor list (15 vendors)'], [daysAgo(0, 5), SYSTEM, 'registry', 'Sanctions screen: clear (simulated)']] as [string, string, Parameters<typeof addAudit>[3], string][]) addAudit(db, manama.id, actor, kind, msg, undefined, at);
  putRegistryCheck(db, { vendorId: manama.id, kind: 'company', provider: 'simulated', status: 'pass', summary: 'Sijilat (simulated): 98765-1 active, expires 2026-11-29', checkedAt: daysAgo(0, 5) });
  putRegistryCheck(db, { vendorId: manama.id, kind: 'tax', provider: 'simulated', status: 'pass', summary: 'NBR (simulated): 200012345600002 active', checkedAt: daysAgo(0, 5) });
  putRegistryCheck(db, { vendorId: manama.id, kind: 'duplicate', provider: 'sap-list', status: 'pass', summary: 'No match in SAP vendor list (15 vendors)', checkedAt: daysAgo(0, 5) });
  putRegistryCheck(db, { vendorId: manama.id, kind: 'sanctions', provider: 'simulated', status: 'pass', summary: 'Clear · UN, OFAC, EU and local lists (simulated)', checkedAt: daysAgo(0, 5) });
  insertEmail(db, { id: uuid(), at: manama.submittedAt!, delivery: 'outbox', ...templates.submitted(manama) });

  // 5. History for the KPIs.
  historical(db, 1, 'Khaleej Uniforms Co.', 'شركة الخليج للزي الموحد', 'KSA', 'Facilities & maintenance', 62, 58, 56, 54);
  historical(db, 2, 'Hayat Cleaning Services LLC', 'حياة لخدمات التنظيف ذ.م.م', 'UAE', 'Facilities & maintenance', 55, 49, 47, 46);
  historical(db, 3, 'Pyramids Packaging', 'الأهرام للتغليف', 'EG', 'Printing & signage', 48, 45, 42, 40, { returned: true });
  historical(db, 4, 'Taif Rose Marketing', 'ورد الطائف للتسويق', 'KSA', 'Marketing & promotions', 40, 38, 37, 35);
  historical(db, 5, 'Sharjah Shelving LLC', 'الشارقة للأرفف ذ.م.م', 'UAE', 'Store fixtures & displays', 33, 29, 27, 26);
  historical(db, 6, 'Luxor Print Studio', 'استوديو الأقصر للطباعة', 'EG', 'Printing & signage', 26, 24, 22, 20);
  historical(db, 7, 'Yanbu Logistics Co.', 'شركة ينبع للخدمات اللوجستية', 'KSA', 'Logistics', 18, 15, 13, 12, { returned: true });
  historical(db, 8, 'Abu Dhabi Visual Merchandising', 'أبوظبي للعرض البصري', 'UAE', 'Store fixtures & displays', 12, 9, 8, 7);
  historical(db, 9, 'Cairo Shopfit Studio', 'استوديو القاهرة لتجهيز المتاجر', 'EG', 'Store fixtures & displays', 9, 6, 4, null);
  const coastline = historical(db, 10, 'Coastline Events LLC', 'كوستلاين للفعاليات ذ.م.م', 'UAE', 'Marketing & promotions', 8, 5, 4, null, { returned: true, status: 'returned' });
  coastline.returnNote = { en: 'Thank you for your registration. One item needs attention: the bank letter is dated more than 6 months ago. Please upload a bank letter issued within the last 6 months, stamped by the bank.', ar: 'شكرًا لتسجيلكم. هناك أمر واحد يحتاج انتباهكم: خطاب البنك صادر قبل أكثر من 6 أشهر. يرجى رفع خطاب بنك صادر خلال آخر 6 أشهر ومختوم من البنك.', sentAt: daysAgo(4), by: DEENA, items: ['Bank letter older than 6 months'] };
  updateVendor(db, coastline);
  insertEmail(db, { id: uuid(), at: daysAgo(4), delivery: 'outbox', ...templates.returned(coastline, coastline.returnNote.en, coastline.returnNote.ar) });
  historical(db, 11, 'Salmiya Signage Co.', 'شركة السالمية للافتات', 'KW', 'Printing & signage', 44, 41, 39, 37);
  historical(db, 12, 'Pearl Cleaning Services W.L.L', 'اللؤلؤة لخدمات التنظيف ذ.م.م', 'QA', 'Facilities & maintenance', 36, 32, 30, 29);
  historical(db, 13, 'Sohar Logistics LLC', 'صحار للخدمات اللوجستية ش.م.م', 'OM', 'Logistics', 22, 19, 17, 16, { returned: true });
  historical(db, 14, 'Muharraq Print Works', 'المحرق للطباعة', 'BH', 'Printing & signage', 15, 12, 10, 9);
}

// CLI: `npm run seed`
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  const db = openDatabase();
  seedDemo(db);
  console.log(`Seeded demo data into ${config.dbPath} at ${nowIso()}`);
}
