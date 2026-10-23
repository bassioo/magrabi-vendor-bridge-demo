// Pre-canned "extraction" results per sample document. Model shown in the audit trail as "Simulated extraction v0".
import type { CheckLevel, DocCheck, Lang, UploadedDoc, Vendor } from './types';
import type { ChecklistItem } from '@/data/checklists';
import { SAMPLE_COMPANIES } from './sampleCompanies';
import { BANK_LETTER_MAX_MONTHS, monthsBetween, registrationNotExpired } from './rules';
import { daysAgo, monthsAgo, nowIso } from './format';
import { wait } from './mockRegistries';
import sampleFiles from '@/data/sampleFiles.json';
import type { Country } from './types';

export const AI_MODEL_LABEL = 'Simulated extraction v0';

export interface SampleDoc {
  key: string;
  file: string;
  title: string;
  titleAr: string;
  docType: string; // 'any' = matches whichever slot it's dropped in
  vendor?: string;
  issuedDate?: string;
  expiryDate?: string;
  legible: boolean;
  stamped: boolean;
  fields: Record<string, string>;
}

const A = SAMPLE_COMPANIES.alnoor;
const J = SAMPLE_COMPANIES.jeddah;
const B = SAMPLE_COMPANIES.bright;
const N = SAMPLE_COMPANIES.nile;

/** Per-country document sets for the GCC markets without a scripted story. {tokens} are filled from the vendor's own form. */
function countrySet(k: 'kw' | 'qa' | 'bh' | 'om', regTitle: string, regTitleAr: string, hasVat: boolean, hasForm: boolean): Record<string, SampleDoc> {
  const out: Record<string, SampleDoc> = {};
  if (hasForm) out[`${k}-registration-form`] = { key: `${k}-registration-form`, file: `/samples/${k}-registration-form.png`, title: 'Vendor registration form', titleAr: 'نموذج تسجيل المورّد', docType: 'registration-form', vendor: k, legible: true, stamped: true, fields: { 'Legal name': '{legalName}', 'Signed by': '{salesName}' } };
  out[`${k}-cr`] = { key: `${k}-cr`, file: `/samples/${k}-cr.png`, title: regTitle, titleAr: regTitleAr, docType: 'cr', vendor: k, expiryDate: '{expiryDate}', legible: true, stamped: true, fields: { 'Registration number': '{regNumber}', 'Legal name': '{legalName}', 'Legal name (AR)': '{legalNameAr}', 'Expiry date': '{expiryDate}', City: '{city}' } };
  if (hasVat) out[`${k}-vat`] = { key: `${k}-vat`, file: `/samples/${k}-vat.png`, title: 'VAT certificate', titleAr: 'شهادة ضريبة القيمة المضافة', docType: 'vat', vendor: k, legible: true, stamped: true, fields: { 'VAT number': '{vatNumber}', 'Legal name': '{legalName}' } };
  else out[`${k}-tax-card`] = { key: `${k}-tax-card`, file: `/samples/${k}-tax-card.png`, title: 'Tax card', titleAr: 'البطاقة الضريبية', docType: 'tax-card', vendor: k, legible: true, stamped: true, fields: { 'Legal name': '{legalName}', Note: 'No VAT regime' } };
  out[`${k}-bank-letter`] = { key: `${k}-bank-letter`, file: `/samples/${k}-bank-letter.png`, title: 'Bank letter', titleAr: 'خطاب البنك', docType: 'bank-letter', vendor: k, issuedDate: daysAgo(10), legible: true, stamped: true, fields: { IBAN: '{iban}', 'Account holder': '{accountHolder}', Bank: '{bankName}' } };
  out[`${k}-quotation`] = { key: `${k}-quotation`, file: `/samples/${k}-quotation.png`, title: 'Signed quotation', titleAr: 'عرض سعر موقّع', docType: 'quotation', vendor: k, legible: true, stamped: true, fields: { 'Quotation no.': `${k.toUpperCase()}-Q-2026-01`, 'Signed by': '{salesName}' } };
  return out;
}

export const SAMPLE_DOCS: Record<string, SampleDoc> = {
  ...countrySet('kw', 'Commercial licence', 'الترخيص التجاري', false, true),
  ...countrySet('qa', 'Commercial registration', 'السجل التجاري', false, true),
  ...countrySet('bh', 'Commercial registration', 'السجل التجاري', true, false),
  ...countrySet('om', 'Commercial registration', 'السجل التجاري', true, false),

  'alnoor-registration-form': { key: 'alnoor-registration-form', file: '/samples/alnoor-registration-form.png', title: 'Vendor registration form', titleAr: 'نموذج تسجيل المورّد', docType: 'registration-form', vendor: 'alnoor', legible: true, stamped: true, fields: { 'Legal name': A.company.legalName, 'Signed by': 'Faisal Al-Harbi, Sales Manager' } },
  'alnoor-cr': { key: 'alnoor-cr', file: '/samples/alnoor-cr.png', title: 'Commercial registration', titleAr: 'السجل التجاري', docType: 'cr', vendor: 'alnoor', expiryDate: A.company.expiryDate, legible: true, stamped: true, fields: { 'CR number': A.company.regNumber, 'Legal name': A.company.legalName, 'Legal name (AR)': A.company.legalNameAr, 'Issue date': A.company.issueDate, 'Expiry date': A.company.expiryDate, City: A.company.city } },
  'alnoor-vat': { key: 'alnoor-vat', file: '/samples/alnoor-vat.png', title: 'VAT certificate', titleAr: 'شهادة ضريبة القيمة المضافة', docType: 'vat', vendor: 'alnoor', legible: true, stamped: true, fields: { 'VAT number': A.tax.vatNumber, 'Legal name': A.company.legalName } },
  'alnoor-bank-letter': { key: 'alnoor-bank-letter', file: '/samples/alnoor-bank-letter.png', title: 'Bank letter', titleAr: 'خطاب البنك', docType: 'bank-letter', vendor: 'alnoor', issuedDate: monthsAgo(1), legible: true, stamped: true, fields: { IBAN: A.bank.iban, 'Account holder': A.bank.accountHolder, Bank: A.bank.bankName } },
  'alnoor-quotation': { key: 'alnoor-quotation', file: '/samples/alnoor-quotation.png', title: 'Signed quotation', titleAr: 'عرض سعر موقّع', docType: 'quotation', vendor: 'alnoor', legible: true, stamped: true, fields: { 'Quotation no.': 'Q-2026-0417', Total: 'SAR 48,500', 'Signed by': 'Faisal Al-Harbi' } },

  'jeddah-registration-form': { key: 'jeddah-registration-form', file: '/samples/jeddah-registration-form.png', title: 'Vendor registration form', titleAr: 'نموذج تسجيل المورّد', docType: 'registration-form', vendor: 'jeddah', legible: true, stamped: true, fields: { 'Legal name': J.company.legalName, 'Signed by': 'Rakan Al-Ghamdi, Sales Director' } },
  'jeddah-cr': { key: 'jeddah-cr', file: '/samples/jeddah-cr.png', title: 'Commercial registration', titleAr: 'السجل التجاري', docType: 'cr', vendor: 'jeddah', expiryDate: J.company.expiryDate, legible: true, stamped: true, fields: { 'CR number': J.company.regNumber, 'Legal name': J.company.legalName, 'Legal name (AR)': J.company.legalNameAr, 'Issue date': J.company.issueDate, 'Expiry date': J.company.expiryDate, City: J.company.city } },
  'jeddah-vat': { key: 'jeddah-vat', file: '/samples/jeddah-vat.png', title: 'VAT certificate', titleAr: 'شهادة ضريبة القيمة المضافة', docType: 'vat', vendor: 'jeddah', legible: true, stamped: true, fields: { 'VAT number': J.tax.vatNumber, 'Legal name': J.company.legalName } },
  'jeddah-bank-letter': { key: 'jeddah-bank-letter', file: '/samples/jeddah-bank-letter.png', title: 'Bank letter', titleAr: 'خطاب البنك', docType: 'bank-letter', vendor: 'jeddah', issuedDate: daysAgo(12), legible: true, stamped: true, fields: { IBAN: J.bank.iban, 'Account holder': J.bank.accountHolder, Bank: J.bank.bankName } },
  'jeddah-quotation': { key: 'jeddah-quotation', file: '/samples/jeddah-quotation.png', title: 'Signed quotation', titleAr: 'عرض سعر موقّع', docType: 'quotation', vendor: 'jeddah', legible: true, stamped: true, fields: { 'Quotation no.': 'JOF-Q-2026-031', Total: 'SAR 96,000', 'Signed by': 'Rakan Al-Ghamdi' } },

  'bright-trade-licence': { key: 'bright-trade-licence', file: '/samples/bright-trade-licence.png', title: 'Trade licence', titleAr: 'الرخصة التجارية', docType: 'trade-licence', vendor: 'bright', expiryDate: B.company.expiryDate, legible: true, stamped: true, fields: { 'Licence number': B.company.regNumber, 'Legal name': B.company.legalName, 'Legal name (AR)': B.company.legalNameAr, 'Issue date': B.company.issueDate, 'Expiry date': B.company.expiryDate, Emirate: B.company.city } },
  'bright-vat': { key: 'bright-vat', file: '/samples/bright-vat.png', title: 'TRN certificate', titleAr: 'شهادة التسجيل الضريبي', docType: 'vat', vendor: 'bright', legible: true, stamped: true, fields: { TRN: B.tax.vatNumber, 'Legal name': B.company.legalName } },
  'bright-bank-letter-old': { key: 'bright-bank-letter-old', file: '/samples/bright-bank-letter-old.png', title: 'Bank letter (8 months old)', titleAr: 'خطاب بنك (قبل 8 أشهر)', docType: 'bank-letter', vendor: 'bright', issuedDate: monthsAgo(8), legible: true, stamped: true, fields: { IBAN: B.bank.iban, 'Account holder': B.bank.accountHolder, Bank: B.bank.bankName } },
  'bright-bank-letter-new': { key: 'bright-bank-letter-new', file: '/samples/bright-bank-letter-new.png', title: 'Bank letter', titleAr: 'خطاب البنك', docType: 'bank-letter', vendor: 'bright', issuedDate: daysAgo(6), legible: true, stamped: true, fields: { IBAN: B.bank.iban, 'Account holder': B.bank.accountHolder, Bank: B.bank.bankName } },
  'bright-quotation': { key: 'bright-quotation', file: '/samples/bright-quotation.png', title: 'Signed quotation', titleAr: 'عرض سعر موقّع', docType: 'quotation', vendor: 'bright', legible: true, stamped: true, fields: { 'Quotation no.': 'BD-Q-1182', Total: 'AED 112,000', 'Signed by': 'Priya Nair' } },

  'nile-commercial-register': { key: 'nile-commercial-register', file: '/samples/nile-commercial-register.png', title: 'Commercial register', titleAr: 'السجل التجاري', docType: 'commercial-register', vendor: 'nile', expiryDate: N.company.expiryDate, legible: true, stamped: true, fields: { 'Register number': N.company.regNumber, 'Legal name': N.company.legalName, 'Legal name (AR)': N.company.legalNameAr, 'Issue date': N.company.issueDate, 'Expiry date': N.company.expiryDate, Governorate: N.company.city } },
  'nile-tax-card': { key: 'nile-tax-card', file: '/samples/nile-tax-card.png', title: 'Tax card', titleAr: 'البطاقة الضريبية', docType: 'tax-card', vendor: 'nile', legible: true, stamped: true, fields: { 'Tax registration': N.tax.vatNumber, 'Legal name': N.company.legalName, 'Tax office': 'Maadi tax office' } },
  'nile-vat': { key: 'nile-vat', file: '/samples/nile-vat.png', title: 'VAT certificate', titleAr: 'شهادة ضريبة القيمة المضافة', docType: 'vat', vendor: 'nile', legible: true, stamped: true, fields: { 'Tax registration': N.tax.vatNumber, 'Legal name': N.company.legalName } },
  'nile-bank-letter': { key: 'nile-bank-letter', file: '/samples/nile-bank-letter.png', title: 'Bank letter', titleAr: 'خطاب البنك', docType: 'bank-letter', vendor: 'nile', issuedDate: daysAgo(20), legible: true, stamped: true, fields: { IBAN: N.bank.iban, 'Account holder': N.bank.accountHolder, Bank: N.bank.bankName } },
  'nile-quotation': { key: 'nile-quotation', file: '/samples/nile-quotation.png', title: 'Signed quotation', titleAr: 'عرض سعر موقّع', docType: 'quotation', vendor: 'nile', legible: true, stamped: true, fields: { 'Quotation no.': 'NG-2026-089', Total: 'EGP 185,000', 'Signed by': 'Mona Fathy' } },
  'nile-einvoice': { key: 'nile-einvoice', file: '/samples/nile-einvoice.png', title: 'E-invoice registration', titleAr: 'تسجيل الفاتورة الإلكترونية', docType: 'e-invoice', vendor: 'nile', legible: true, stamped: true, fields: { 'Tax registration': N.tax.vatNumber, 'E-invoice status': 'Registered' } },

  // Generic failure variants for the demo picker
  'sample-blurry': { key: 'sample-blurry', file: '/samples/sample-blurry.png', title: 'Blurry scan', titleAr: 'نسخة غير واضحة', docType: 'any', legible: false, stamped: true, fields: {} },
  'sample-invoice': { key: 'sample-invoice', file: '/samples/sample-invoice.png', title: 'Tax invoice', titleAr: 'فاتورة ضريبية', docType: 'invoice', legible: true, stamped: true, fields: { 'Invoice no.': 'INV-0931' } },
  'sample-unstamped': { key: 'sample-unstamped', file: '/samples/sample-unstamped.png', title: 'Unstamped copy', titleAr: 'نسخة بدون ختم', docType: 'any', legible: true, stamped: false, fields: {} },
};

export type VendorKey = 'alnoor' | 'jeddah' | 'bright' | 'nile' | 'kw' | 'qa' | 'bh' | 'om';

export function vendorKeyFor(country: Country, hint?: { email?: string; company?: { regNumber?: string } }): VendorKey {
  const email = (hint?.email ?? '').toLowerCase();
  const reg = hint?.company?.regNumber ?? '';
  if (email === SAMPLE_COMPANIES.jeddah.email || (reg && reg === SAMPLE_COMPANIES.jeddah.company.regNumber)) return 'jeddah';
  return country === 'KSA' ? 'alnoor' : country === 'UAE' ? 'bright' : country === 'EG' ? 'nile' : (country.toLowerCase() as VendorKey);
}

const gcc = (k: string) => ({ 'registration-form': `${k}-registration-form`, cr: `${k}-cr`, vat: `${k}-vat`, 'tax-card': `${k}-tax-card`, 'bank-letter': `${k}-bank-letter`, quotation: `${k}-quotation` });

const DEFAULT_SAMPLE: Record<VendorKey, Record<string, string>> = {
  kw: gcc('kw'), qa: gcc('qa'), bh: gcc('bh'), om: gcc('om'),
  alnoor: { 'registration-form': 'alnoor-registration-form', cr: 'alnoor-cr', vat: 'alnoor-vat', 'bank-letter': 'alnoor-bank-letter', quotation: 'alnoor-quotation' },
  jeddah: { 'registration-form': 'jeddah-registration-form', cr: 'jeddah-cr', vat: 'jeddah-vat', 'bank-letter': 'jeddah-bank-letter', quotation: 'jeddah-quotation' },
  bright: { 'trade-licence': 'bright-trade-licence', vat: 'bright-vat', 'bank-letter': 'bright-bank-letter-new', quotation: 'bright-quotation' },
  nile: { 'commercial-register': 'nile-commercial-register', 'tax-card': 'nile-tax-card', vat: 'nile-vat', 'bank-letter': 'nile-bank-letter', quotation: 'nile-quotation', 'e-invoice': 'nile-einvoice' },
};

export function defaultSampleKey(vendorKey: VendorKey, slotId: string): string {
  return DEFAULT_SAMPLE[vendorKey][slotId] ?? 'sample-unstamped';
}

export interface PickerOption {
  key: string;
  label: string;
  labelAr: string;
}

export function pickerOptions(vendorKey: VendorKey, slot: ChecklistItem): PickerOption[] {
  const def = defaultSampleKey(vendorKey, slot.id);
  const opts: PickerOption[] = [{ key: def, label: `Good · ${slot.label}`, labelAr: `${slot.labelAr} (سليم)` }];
  if (slot.docType === 'bank-letter') opts.push({ key: 'bright-bank-letter-old', label: 'Bank letter dated 8 months ago', labelAr: 'خطاب بنك قبل 8 أشهر' });
  opts.push(
    { key: 'sample-blurry', label: 'Blurry scan', labelAr: 'نسخة غير واضحة' },
    { key: 'sample-unstamped', label: 'Missing stamp', labelAr: 'بدون ختم' },
    { key: 'sample-invoice', label: 'Wrong document (invoice)', labelAr: 'مستند خاطئ (فاتورة)' },
  );
  return opts;
}

function worst(levels: CheckLevel[]): CheckLevel {
  if (levels.includes('fail')) return 'fail';
  if (levels.includes('flag')) return 'flag';
  if (levels.includes('pending')) return 'pending';
  return 'pass';
}

const DATE_RULE_TYPES = new Set(['cr', 'trade-licence', 'commercial-register']);

/** Synchronous rule evaluation for a sample document dropped into a slot. */
export function runDocChecks(slot: ChecklistItem, sample: SampleDoc, today = nowIso()): DocCheck[] {
  const typeOk = sample.docType === 'any' || sample.docType === slot.docType;
  const checks: DocCheck[] = [
    {
      id: 'type',
      level: typeOk ? 'pass' : 'fail',
      label: 'Document type',
      labelAr: 'نوع المستند',
      reason: typeOk ? `Recognised as ${slot.label.toLowerCase()}` : `This looks like a ${sample.title.toLowerCase()}, not a ${slot.label.toLowerCase()}.${sample.docType === 'invoice' ? ' A signed quotation or contract is enough; no invoice is needed before the PO.' : ''}`,
      reasonAr: typeOk ? `تم التعرّف عليه كـ ${slot.labelAr}` : `يبدو أن هذا المستند ${sample.titleAr} وليس ${slot.labelAr}.${sample.docType === 'invoice' ? ' عرض السعر أو العقد الموقّع يكفي، ولا حاجة لفاتورة قبل أمر الشراء.' : ''}`,
    },
    {
      id: 'legible',
      level: sample.legible ? 'pass' : 'fail',
      label: 'Legible scan',
      labelAr: 'وضوح النسخة',
      reason: sample.legible ? 'Text is clear and readable' : 'The scan is too blurry to read. Please upload a clearer copy or a photo in good light.',
      reasonAr: sample.legible ? 'النص واضح ومقروء' : 'النسخة غير واضحة بما يكفي للقراءة. يرجى رفع نسخة أوضح أو صورة في إضاءة جيدة.',
    },
    {
      id: 'stamp',
      level: sample.stamped ? 'pass' : 'fail',
      label: 'Stamp or signature',
      labelAr: 'الختم أو التوقيع',
      reason: sample.stamped ? 'Stamp and signature detected' : "We couldn't find a stamp or signature. Please upload a stamped and signed copy.",
      reasonAr: sample.stamped ? 'تم رصد الختم والتوقيع' : 'لم نجد ختمًا أو توقيعًا. يرجى رفع نسخة مختومة وموقّعة.',
    },
  ];

  if (slot.docType === 'bank-letter' && sample.issuedDate) {
    const months = monthsBetween(sample.issuedDate, today);
    const ok = months <= BANK_LETTER_MAX_MONTHS;
    checks.push({
      id: 'date',
      level: ok ? 'pass' : 'fail',
      label: 'Dates within policy',
      labelAr: 'التواريخ ضمن السياسة',
      reason: ok ? `Issued ${months === 0 ? 'this month' : `${months} month${months === 1 ? '' : 's'} ago`} · within the 6-month rule` : `This bank letter is dated ${months} months ago. Please upload one issued within the last 6 months.`,
      reasonAr: ok ? `صادر ${months === 0 ? 'هذا الشهر' : `قبل ${months} أشهر`} · ضمن قاعدة الستة أشهر` : `خطاب البنك هذا صادر قبل ${months} أشهر. يرجى رفع خطاب صادر خلال آخر 6 أشهر.`,
    });
  } else if (DATE_RULE_TYPES.has(slot.docType) && sample.expiryDate) {
    const ok = registrationNotExpired(sample.expiryDate, today);
    checks.push({
      id: 'date',
      level: ok ? 'pass' : 'fail',
      label: 'Dates within policy',
      labelAr: 'التواريخ ضمن السياسة',
      reason: ok ? `Valid until ${sample.expiryDate}` : `This registration expired on ${sample.expiryDate}. Please renew it first.`,
      reasonAr: ok ? `ساري حتى ${sample.expiryDate}` : `انتهت صلاحية هذا السجل في ${sample.expiryDate}. يرجى تجديده أولًا.`,
    });
  } else {
    checks.push({ id: 'date', level: 'pass', label: 'Dates within policy', labelAr: 'التواريخ ضمن السياسة', reason: 'No date rule applies to this document', reasonAr: 'لا تنطبق قاعدة تاريخ على هذا المستند' });
  }
  // If the type is wrong, the other checks are not meaningful: show them as pending.
  if (!typeOk) for (const c of checks) if (c.id !== 'type') c.level = 'pending';
  return checks;
}

/** Values used to fill {tokens} in generic sample documents, taken from the vendor's own form. */
export type VendorFields = Pick<Vendor, 'company' | 'tax' | 'bank' | 'contacts'>;

function fill(value: string, v?: VendorFields): string {
  if (!v) return value;
  const map: Record<string, string> = {
    legalName: v.company.legalName, legalNameAr: v.company.legalNameAr, regNumber: v.company.regNumber, expiryDate: v.company.expiryDate, city: v.company.city,
    vatNumber: v.tax.vatNumber || 'n/a', iban: v.bank.iban, accountHolder: v.bank.accountHolder, bankName: v.bank.bankName, salesName: v.contacts.sales.name,
  };
  return value.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? '');
}

export function buildUploadedDoc(slot: ChecklistItem, sampleKey: string, fileName: string, at = nowIso(), vendor?: VendorFields): UploadedDoc {
  const raw = SAMPLE_DOCS[sampleKey] ?? SAMPLE_DOCS['sample-unstamped'];
  const sample: SampleDoc = { ...raw, expiryDate: raw.expiryDate ? fill(raw.expiryDate, vendor) : undefined, fields: Object.fromEntries(Object.entries(raw.fields).map(([k, val]) => [k, fill(val, vendor)])) };
  const checks = runDocChecks(slot, sample, at);
  return { slotId: slot.id, fileName, sampleKey, image: sample.file, uploadedAt: at, checks, extracted: sample.fields, level: worst(checks.map((c) => c.level)) };
}

/** Async wrapper with a realistic "Reading document…" delay. */
export async function extractDocument(slot: ChecklistItem, sampleKey: string, fileName: string, vendor?: VendorFields): Promise<UploadedDoc> {
  await wait(900, 1500);
  return buildUploadedDoc(slot, sampleKey, fileName, nowIso(), vendor);
}

const norm = (s: string) => s.toLowerCase().replace(/\.(pdf|png|jpe?g)$/i, '').replace(/[^a-z0-9]+/g, ' ').trim();
const FILE_INDEX: { name: string; key: string }[] = (sampleFiles as { key: string; file: string }[]).map((f) => ({ name: norm(f.file), key: f.key }));

/** Maps an uploaded file to a sample by its name (friendly names from the test folder, or the raw sample key). Null if unknown. */
export function resolveSampleKey(fileName: string): string | null {
  const n = norm(fileName);
  if (!n) return null;
  const exact = FILE_INDEX.find((f) => f.name === n);
  if (exact) return exact.key;
  const byKey = Object.keys(SAMPLE_DOCS).find((k) => n.includes(k.replace(/-/g, ' ')) || n.replace(/ /g, '-').includes(k));
  return byKey ?? null;
}

export function checkReason(check: DocCheck, lang: Lang): string {
  return lang === 'ar' ? check.reasonAr : check.reason;
}
