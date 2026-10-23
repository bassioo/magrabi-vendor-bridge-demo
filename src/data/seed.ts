import { DEFAULT_SETTINGS, type AppState, type AuditEntry, type Country, type Email, type UploadedDoc, type Vendor } from '@/lib/types';
import { SAP_VENDORS } from './sapVendors';
import { CHECKLISTS } from './checklists';
import { SAMPLE_COMPANIES, sampleForCountry, type SampleCompany } from '@/lib/sampleCompanies';
import { buildUploadedDoc, defaultSampleKey, vendorKeyFor, AI_MODEL_LABEL } from '@/lib/mockAi';
import { daysAgo, uid } from '@/lib/format';
import { makeIban } from '@/lib/iban';
import { COUNTRIES } from './countries';

const HANA = 'Hana (Requester)';
const DEENA = 'Deena (Approver)';
const SYSTEM = 'System';

function emptyVendor(partial: Partial<Vendor> & Pick<Vendor, 'id' | 'inviteId' | 'email' | 'country' | 'category' | 'invitedAt'>): Vendor {
  return {
    name: '',
    status: 'invited',
    invitedBy: HANA,
    returnCount: 0,
    lang: 'en',
    stage: 'welcome',
    formStep: 0,
    company: { regNumber: '', legalName: '', legalNameAr: '', regStatus: '', issueDate: '', expiryDate: '', city: '', address: '' },
    tax: { vatNumber: '' },
    bank: { iban: '', bankName: '', accountHolder: '' },
    contacts: { sales: { name: '', email: '', phone: '' }, ar: { name: '', email: '', phone: '' } },
    documents: {},
    audit: [],
    notes: [],
    bankIsNew: true,
    ...partial,
  };
}

function entry(at: string, actor: string, kind: AuditEntry['kind'], message: string, detail?: string): AuditEntry {
  return { id: uid('a-'), at, actor, kind, message, detail };
}

function docsFor(company: SampleCompany, overrides: Record<string, string> = {}, at: string): Record<string, UploadedDoc> {
  const out: Record<string, UploadedDoc> = {};
  for (const slot of CHECKLISTS[company.country]) {
    const key = overrides[slot.id] ?? defaultSampleKey(vendorKeyFor(company.country, company), slot.id);
    out[slot.id] = buildUploadedDoc(slot, key, `${slot.id}.pdf`, at, company);
  }
  return out;
}

function fromSample(s: SampleCompany, extra: Partial<Vendor>): Vendor {
  const suffix: Record<string, string> = { alnoor: '7f3k', jeddah: 'x9p2', bright: 'q9d2', nile: 'm4x8' };
  const key = s.key === 'generic' ? s.country.toLowerCase() : s.key;
  return emptyVendor({
    id: `v-${key}`,
    inviteId: `inv-${key}-${suffix[s.key] ?? 'k2p7'}`,
    email: s.email,
    country: s.country,
    category: s.category,
    invitedAt: daysAgo(3),
    name: s.company.legalName,
    company: { ...s.company },
    tax: { ...s.tax },
    bank: { ...s.bank },
    contacts: { sales: { ...s.contacts.sales }, ar: { ...s.contacts.ar } },
    ...extra,
  });
}

function histBban(country: Country, i: number): string {
  const n = (s: number) => (10 ** s + i * 7919).toString().slice(-s);
  switch (country) {
    case 'KSA': return `20${n(18)}`;
    case 'UAE': return `026${n(16)}`;
    case 'EG': return `0019${n(4)}${n(17)}`;
    case 'KW': return `HIST${n(22)}`;
    case 'QA': return `HIST${n(21)}`;
    case 'BH': return `HIST${n(14)}`;
    case 'OM': return `012${n(16)}`;
  }
}

function historical(i: number, name: string, nameAr: string, country: Country, category: string, inviteDays: number, submitDays: number, reviewDays: number, codeDays: number | null, opts: { returned?: boolean; status?: Vendor['status'] } = {}): Vendor {
  const regNumber = country === 'KSA' ? `10109${(10000 + i * 731).toString().slice(-5)}` : country === 'UAE' ? `CN-9${(100000 + i * 4321).toString().slice(-6)}` : country === 'EG' ? `9${(1000 + i * 97).toString().slice(-4)}` : `${(500000 + i * 7919).toString()}`;
  const vat = country === 'KSA' ? `3009${(1000000000 + i * 12345).toString().slice(-10)}3` : country === 'UAE' ? `1009${(100000000 + i * 54321).toString().slice(-11)}` : country === 'EG' ? `9${(10 + i).toString().slice(-2)}-${(100 + i * 7).toString().slice(-3)}-${(100 + i * 13).toString().slice(-3)}` : country === 'BH' ? `2009${(10000000000 + i * 777).toString().slice(-11)}` : country === 'OM' ? `OM11000${(10000 + i * 31).toString().slice(-5)}` : '';
  const status: Vendor['status'] = opts.status ?? (codeDays !== null ? 'code_issued' : 'approved');
  const v = emptyVendor({
    id: `v-hist-${i}`,
    inviteId: `inv-hist-${i}`,
    email: `accounts@${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`,
    country,
    category,
    invitedAt: daysAgo(inviteDays),
    invitedBy: i % 2 ? HANA : DEENA,
    name,
    status,
    stage: 'status',
    submittedAt: daysAgo(submitDays),
    reviewStartedAt: daysAgo(reviewDays, 6),
    approvedAt: status === 'returned' ? undefined : daysAgo(reviewDays),
    approvedBy: status === 'returned' ? undefined : i % 2 ? DEENA : HANA,
    codeIssuedAt: codeDays !== null ? daysAgo(codeDays) : undefined,
    vendorCode: codeDays !== null ? `4002${(10 + i).toString()}` : undefined,
    firstTimeRight: !opts.returned,
    returnCount: opts.returned ? 1 : 0,
    company: { regNumber, legalName: name, legalNameAr: nameAr, regStatus: 'Active', issueDate: '2022-02-01', expiryDate: '2028-01-31', city: sampleForCountry(country).company.city, address: 'Sample address' },
    tax: { vatNumber: vat },
    bank: { iban: makeIban(COUNTRIES[country].ibanPrefix, histBban(country, i)), bankName: 'Sample Bank', accountHolder: name },
    bankIsNew: false,
  });
  v.audit = [
    entry(v.invitedAt, v.invitedBy, 'review', `Invite sent to ${v.email}`),
    entry(v.submittedAt!, 'Vendor', 'system', 'Registration submitted'),
    ...(opts.returned ? [entry(daysAgo(reviewDays + 1), DEENA, 'review', 'Returned to vendor: bank letter older than 6 months'), entry(daysAgo(reviewDays, 12), 'Vendor', 'upload', 'Resubmitted with a new bank letter')] : []),
    ...(v.approvedAt ? [entry(v.approvedAt, v.approvedBy!, 'review', 'Approved · bank details confirmed by call-back')] : []),
    ...(v.codeIssuedAt ? [entry(v.codeIssuedAt, v.approvedBy!, 'system', `Vendor code ${v.vendorCode} issued · vendor notified (simulated)`)] : []),
  ];
  return v;
}

export function buildSeed(): AppState {
  const A = SAMPLE_COMPANIES.alnoor;
  const B = SAMPLE_COMPANIES.bright;
  const N = SAMPLE_COMPANIES.nile;

  // 1. Al Noor Print House — invited, nothing submitted yet. The live demo fills this in.
  const alnoor = emptyVendor({
    id: 'v-alnoor',
    inviteId: 'inv-alnoor-7f3k',
    email: A.email,
    country: 'KSA',
    category: A.category,
    invitedAt: daysAgo(0, 2),
    invitedBy: HANA,
    name: '',
  });
  alnoor.audit = [entry(alnoor.invitedAt, HANA, 'review', `Invite sent to ${A.email} · KSA · ${A.category}`, 'Link: /vendor/inv-alnoor-7f3k')];

  // 1b. Jeddah Optical Fixtures — second KSA invite, for a second live run in a showcase.
  const JD = SAMPLE_COMPANIES.jeddah;
  const jeddah = emptyVendor({
    id: 'v-jeddah',
    inviteId: 'inv-jeddah-x9p2',
    email: JD.email,
    country: 'KSA',
    category: JD.category,
    invitedAt: daysAgo(0, 1),
    invitedBy: HANA,
    name: '',
  });
  jeddah.audit = [entry(jeddah.invitedAt, HANA, 'review', `Invite sent to ${JD.email} · KSA · ${JD.category}`, 'Link: /vendor/inv-jeddah-x9p2')];

  // 2. Bright Display — caught at upload (old bank letter), fixed, now in review with everything green.
  const bright = fromSample(B, {
    status: 'in_review',
    stage: 'status',
    invitedAt: daysAgo(4),
    invitedBy: HANA,
    submittedAt: daysAgo(1, 3),
    reviewStartedAt: daysAgo(0, 1),
    documents: docsFor(B, {}, daysAgo(1, 4)),
  });
  bright.audit = [
    entry(daysAgo(4), HANA, 'review', `Invite sent to ${B.email} · UAE · ${B.category}`),
    entry(daysAgo(2, 5), 'Vendor', 'system', 'Form saved · steps 1–4 complete'),
    entry(daysAgo(2, 5), SYSTEM, 'rule', 'IBAN checksum valid (mod-97)', B.bank.iban),
    entry(daysAgo(1, 6), 'Vendor', 'upload', 'Uploaded bank letter · bank-letter-feb.pdf'),
    entry(daysAgo(1, 6), SYSTEM, 'ai', `${AI_MODEL_LABEL}: read bank letter · IBAN, account holder, issue date`, 'Issue date 8 months ago'),
    entry(daysAgo(1, 6), SYSTEM, 'rule', 'Bank letter FAILED the 6-month rule · vendor told instantly', 'This bank letter is dated 8 months ago. Please upload one issued within the last 6 months.'),
    entry(daysAgo(1, 5), 'Vendor', 'upload', 'Replaced bank letter · bank-letter-oct.pdf'),
    entry(daysAgo(1, 5), SYSTEM, 'ai', `${AI_MODEL_LABEL}: read bank letter · IBAN matches form`, 'Issue date 6 days ago'),
    entry(daysAgo(1, 5), SYSTEM, 'rule', 'Bank letter passed the 6-month rule'),
    entry(daysAgo(1, 4), 'Vendor', 'upload', 'Uploaded trade licence, TRN certificate, signed quotation · all checks passed'),
    entry(daysAgo(1, 3), 'Vendor', 'system', 'Registration submitted'),
    entry(daysAgo(1, 3), SYSTEM, 'registry', 'DED (simulated): licence CN-7654321 active, expires 2027-01-09'),
    entry(daysAgo(1, 3), SYSTEM, 'registry', 'FTA (simulated): TRN 100765432100003 active'),
    entry(daysAgo(1, 3), SYSTEM, 'rule', 'Duplicate check: no match in SAP vendor list (15 vendors)'),
    entry(daysAgo(1, 3), SYSTEM, 'registry', 'Sanctions screen (simulated): clear'),
    entry(daysAgo(0, 1), DEENA, 'review', 'Opened for review'),
  ];

  // 3. Nile Gifts — caught in review: tax registration already exists in SAP.
  const nile = fromSample(N, {
    status: 'in_review',
    stage: 'status',
    invitedAt: daysAgo(5),
    invitedBy: HANA,
    submittedAt: daysAgo(2, 2),
    reviewStartedAt: daysAgo(0, 3),
    documents: docsFor(N, {}, daysAgo(2, 3)),
  });
  nile.audit = [
    entry(daysAgo(5), HANA, 'review', `Invite sent to ${N.email} · Egypt · ${N.category}`),
    entry(daysAgo(3), 'Vendor', 'system', 'Form saved · steps 1–4 complete'),
    entry(daysAgo(3), SYSTEM, 'rule', 'IBAN checksum valid (mod-97)', N.bank.iban),
    entry(daysAgo(2, 3), 'Vendor', 'upload', 'Uploaded 6 documents · all checks passed'),
    entry(daysAgo(2, 3), SYSTEM, 'ai', `${AI_MODEL_LABEL}: read 6 documents · names consistent across documents`),
    entry(daysAgo(2, 2), 'Vendor', 'system', 'Registration submitted'),
    entry(daysAgo(2, 2), SYSTEM, 'registry', 'GAFI (simulated): register 76598 active'),
    entry(daysAgo(2, 2), SYSTEM, 'registry', 'ETA (simulated): tax registration 345-678-912 active'),
    entry(daysAgo(2, 2), SYSTEM, 'rule', 'Duplicate check: FLAG · SAP vendor 400112 "Nile Gifts and Promotional Items" shares tax registration 345-678-912', 'Matched on: tax registration, normalised name'),
    entry(daysAgo(2, 2), SYSTEM, 'registry', 'Sanctions screen (simulated): clear'),
    entry(daysAgo(0, 3), DEENA, 'review', 'Opened for review'),
  ];

  // 4. Manama Optical Fixtures (Bahrain) — just submitted, nothing flagged. Shows the queue is multi-country.
  const manama = fromSample(sampleForCountry('BH'), {
    status: 'submitted',
    stage: 'status',
    invitedAt: daysAgo(2),
    invitedBy: HANA,
    submittedAt: daysAgo(0, 5),
    documents: docsFor(sampleForCountry('BH'), {}, daysAgo(0, 6)),
  });
  manama.audit = [
    entry(daysAgo(2), HANA, 'review', `Invite sent to ${manama.email} · Bahrain · ${manama.category}`),
    entry(daysAgo(0, 7), 'Vendor', 'system', 'Form saved · steps 1–4 complete'),
    entry(daysAgo(0, 7), SYSTEM, 'rule', 'IBAN checksum valid (mod-97)', manama.bank.iban),
    entry(daysAgo(0, 6), 'Vendor', 'upload', 'Uploaded 4 documents · all checks passed'),
    entry(daysAgo(0, 5), 'Vendor', 'system', 'Registration submitted'),
    entry(daysAgo(0, 5), SYSTEM, 'registry', 'Sijilat (simulated): CR 98765-1 active, expires 2026-11-29'),
    entry(daysAgo(0, 5), SYSTEM, 'registry', 'NBR (simulated): VAT account 200012345600002 active'),
    entry(daysAgo(0, 5), SYSTEM, 'rule', 'Duplicate check: no match in SAP vendor list (15 vendors)'),
    entry(daysAgo(0, 5), SYSTEM, 'registry', 'Sanctions screen (simulated): clear'),
  ];

  const history: Vendor[] = [
    historical(1, 'Khaleej Uniforms Co.', 'شركة الخليج للزي الموحد', 'KSA', 'Facilities & maintenance', 62, 58, 56, 54),
    historical(2, 'Hayat Cleaning Services LLC', 'حياة لخدمات التنظيف ذ.م.م', 'UAE', 'Facilities & maintenance', 55, 49, 47, 46),
    historical(3, 'Pyramids Packaging', 'الأهرام للتغليف', 'EG', 'Printing & signage', 48, 45, 42, 40, { returned: true }),
    historical(4, 'Taif Rose Marketing', 'ورد الطائف للتسويق', 'KSA', 'Marketing & promotions', 40, 38, 37, 35),
    historical(5, 'Sharjah Shelving LLC', 'الشارقة للأرفف ذ.م.م', 'UAE', 'Store fixtures & displays', 33, 29, 27, 26),
    historical(6, 'Luxor Print Studio', 'استوديو الأقصر للطباعة', 'EG', 'Printing & signage', 26, 24, 22, 20),
    historical(7, 'Yanbu Logistics Co.', 'شركة ينبع للخدمات اللوجستية', 'KSA', 'Logistics', 18, 15, 13, 12, { returned: true }),
    historical(8, 'Abu Dhabi Visual Merchandising', 'أبوظبي للعرض البصري', 'UAE', 'Store fixtures & displays', 12, 9, 8, 7),
    historical(9, 'Cairo Shopfit Studio', 'استوديو القاهرة لتجهيز المتاجر', 'EG', 'Store fixtures & displays', 9, 6, 4, null),
    historical(10, 'Coastline Events LLC', 'كوستلاين للفعاليات ذ.م.م', 'UAE', 'Marketing & promotions', 8, 5, 4, null, { returned: true, status: 'returned' }),
    historical(11, 'Salmiya Signage Co.', 'شركة السالمية للافتات', 'KW', 'Printing & signage', 44, 41, 39, 37),
    historical(12, 'Pearl Cleaning Services W.L.L', 'اللؤلؤة لخدمات التنظيف ذ.م.م', 'QA', 'Facilities & maintenance', 36, 32, 30, 29),
    historical(13, 'Sohar Logistics LLC', 'صحار للخدمات اللوجستية ش.م.م', 'OM', 'Logistics', 22, 19, 17, 16, { returned: true }),
    historical(14, 'Muharraq Print Works', 'المحرق للطباعة', 'BH', 'Printing & signage', 15, 12, 10, 9),
  ];
  const coastline = history[9];
  coastline.returnNote = {
    en: 'Thank you for your registration. One item needs attention: the bank letter is dated more than 6 months ago. Please upload a bank letter issued within the last 6 months, stamped by the bank.',
    ar: 'شكرًا لتسجيلكم. هناك أمر واحد يحتاج انتباهكم: خطاب البنك صادر قبل أكثر من 6 أشهر. يرجى رفع خطاب بنك صادر خلال آخر 6 أشهر ومختوم من البنك.',
    sentAt: daysAgo(4),
    by: DEENA,
    items: ['Bank letter older than 6 months'],
  };

  bright.assignee = DEENA;
  nile.assignee = DEENA;
  nile.notes = [{ id: uid('n-'), at: daysAgo(0, 3), by: DEENA, text: 'Looks like the same company as 400112 (renamed in 2024?). Asking the vendor for their existing code before we create a second account.' }];

  const emails: Email[] = [
    { id: uid('e-'), at: alnoor.invitedAt, to: A.email, vendorId: alnoor.id, kind: 'invite', subject: 'MAGRABi · Your vendor registration link', bodyEn: `Hello,\n\nMAGRABi has invited you to register as a supplier (${A.category}). Use the link below. It takes about 10 minutes and you can save and come back.\n\n/vendor/inv-alnoor-7f3k\n\nKind regards,\nHana · MAGRABi Procurement`, bodyAr: 'مرحبًا،\n\nدعتكم مغربي للتسجيل كمورّد. استخدموا الرابط أدناه. يستغرق الأمر حوالي 10 دقائق ويمكنكم الحفظ والعودة لاحقًا.\n\nمع أطيب التحيات،\nهنا · المشتريات، مغربي' },
    { id: uid('e-'), at: jeddah.invitedAt, to: JD.email, vendorId: jeddah.id, kind: 'invite', subject: 'MAGRABi · Your vendor registration link', bodyEn: `Hello,\n\nMAGRABi has invited you to register as a supplier (${JD.category}). Use the link below.\n\n/vendor/inv-jeddah-x9p2\n\nKind regards,\nHana · MAGRABi Procurement`, bodyAr: 'مرحبًا،\n\nدعتكم مغربي للتسجيل كمورّد. استخدموا الرابط أدناه.\n\nمع أطيب التحيات،\nهنا · المشتريات، مغربي' },
    { id: uid('e-'), at: bright.submittedAt!, to: B.email, vendorId: bright.id, kind: 'submitted', subject: 'MAGRABi · Registration received', bodyEn: `Thank you. We received the registration for ${B.company.legalName}. Procurement reviews most files within two working days.`, bodyAr: `شكرًا لكم. استلمنا طلب تسجيل ${B.company.legalNameAr}. يراجع فريق المشتريات معظم الطلبات خلال يومي عمل.` },
    { id: uid('e-'), at: nile.submittedAt!, to: N.email, vendorId: nile.id, kind: 'submitted', subject: 'MAGRABi · Registration received', bodyEn: `Thank you. We received the registration for ${N.company.legalName}. Procurement reviews most files within two working days.`, bodyAr: `شكرًا لكم. استلمنا طلب تسجيل ${N.company.legalNameAr}. يراجع فريق المشتريات معظم الطلبات خلال يومي عمل.` },
    { id: uid('e-'), at: manama.submittedAt!, to: manama.email, vendorId: manama.id, kind: 'submitted', subject: 'MAGRABi · Registration received', bodyEn: `Thank you. We received the registration for ${manama.company.legalName}. Procurement reviews most files within two working days.`, bodyAr: `شكرًا لكم. استلمنا طلب تسجيل ${manama.company.legalNameAr}.` },
    { id: uid('e-'), at: coastline.returnNote.sentAt, to: coastline.email, vendorId: coastline.id, kind: 'returned', subject: 'MAGRABi · One thing to fix in your registration', bodyEn: coastline.returnNote.en, bodyAr: coastline.returnNote.ar },
  ];

  return {
    vendors: [alnoor, jeddah, bright, nile, manama, ...history],
    sapVendors: SAP_VENDORS.map((s) => ({ ...s })),
    emails,
    settings: { ...DEFAULT_SETTINGS },
    currentUser: HANA,
    seededAt: new Date().toISOString(),
    lastSeenAt: daysAgo(1),
    tourDone: false,
    welcomeDismissed: false,
  };
}
