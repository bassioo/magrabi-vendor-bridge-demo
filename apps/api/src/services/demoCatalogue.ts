// Demo-mode document catalogue: what the "AI" reads from each sample document. Files live in data/samples/<key>.png.
// Dates are relative so the stories stay fresh ("8 months ago" is always 8 months ago).
import type { ExtractionResult } from '@vendorhub/shared';
import { SAMPLE_COMPANIES, type SampleCompany } from './demoData.js';
import { daysAgo, monthsAgo } from '../lib/time.js';

export interface SampleDoc {
  key: string;
  title: string;
  docType: string; // 'any' matches whichever slot it is dropped in
  vendor?: SampleCompany['key'];
  issued?: { monthsAgo?: number; daysAgo?: number };
  expiry?: string | 'company'; // 'company' = the sample company's registration expiry
  legible: boolean;
  stamped: boolean;
  fields: Record<string, string>; // {token} values are filled from the vendor's own form data
}

const A = SAMPLE_COMPANIES.alnoor, J = SAMPLE_COMPANIES.jeddah, B = SAMPLE_COMPANIES.bright, N = SAMPLE_COMPANIES.nile;

function ksaSet(k: 'alnoor' | 'jeddah', c: SampleCompany, signer: string, quote: [string, string], bankIssued: SampleDoc['issued']): SampleDoc[] {
  return [
    { key: `${k}-registration-form`, title: 'Vendor registration form', docType: 'registration-form', vendor: k, legible: true, stamped: true, fields: { 'Legal name': c.company.legalName, 'Signed by': signer } },
    { key: `${k}-cr`, title: 'Commercial registration', docType: 'cr', vendor: k, expiry: 'company', legible: true, stamped: true, fields: { 'CR number': c.company.regNumber, 'Legal name': c.company.legalName, 'Legal name (AR)': c.company.legalNameAr, 'Issue date': c.company.issueDate, 'Expiry date': c.company.expiryDate, City: c.company.city } },
    { key: `${k}-vat`, title: 'VAT certificate', docType: 'vat', vendor: k, legible: true, stamped: true, fields: { 'VAT number': c.tax.vatNumber, 'Legal name': c.company.legalName } },
    { key: `${k}-bank-letter`, title: 'Bank letter', docType: 'bank-letter', vendor: k, issued: bankIssued, legible: true, stamped: true, fields: { IBAN: c.bank.iban, 'Account holder': c.bank.accountHolder, Bank: c.bank.bankName } },
    { key: `${k}-quotation`, title: 'Signed quotation', docType: 'quotation', vendor: k, legible: true, stamped: true, fields: { 'Quotation no.': quote[0], Total: quote[1], 'Signed by': signer.split(',')[0] } },
  ];
}
function gccSet(k: 'kw' | 'qa' | 'bh' | 'om', regTitle: string, hasVat: boolean, hasForm: boolean): SampleDoc[] {
  const out: SampleDoc[] = [];
  if (hasForm) out.push({ key: `${k}-registration-form`, title: 'Vendor registration form', docType: 'registration-form', vendor: k, legible: true, stamped: true, fields: { 'Legal name': '{legalName}', 'Signed by': '{salesName}' } });
  out.push({ key: `${k}-cr`, title: regTitle, docType: 'cr', vendor: k, expiry: 'company', legible: true, stamped: true, fields: { 'Registration number': '{regNumber}', 'Legal name': '{legalName}', 'Legal name (AR)': '{legalNameAr}', 'Expiry date': '{expiryDate}', City: '{city}' } });
  if (hasVat) out.push({ key: `${k}-vat`, title: 'VAT certificate', docType: 'vat', vendor: k, legible: true, stamped: true, fields: { 'VAT number': '{vatNumber}', 'Legal name': '{legalName}' } });
  else out.push({ key: `${k}-tax-card`, title: 'Tax card', docType: 'tax-card', vendor: k, legible: true, stamped: true, fields: { 'Legal name': '{legalName}', Note: 'No VAT regime' } });
  out.push({ key: `${k}-bank-letter`, title: 'Bank letter', docType: 'bank-letter', vendor: k, issued: { daysAgo: 10 }, legible: true, stamped: true, fields: { IBAN: '{iban}', 'Account holder': '{accountHolder}', Bank: '{bankName}' } });
  out.push({ key: `${k}-quotation`, title: 'Signed quotation', docType: 'quotation', vendor: k, legible: true, stamped: true, fields: { 'Quotation no.': `${k.toUpperCase()}-Q-2026-01`, 'Signed by': '{salesName}' } });
  return out;
}

export const SAMPLE_DOCS: Record<string, SampleDoc> = Object.fromEntries(
  ([
    ...ksaSet('alnoor', A, 'Faisal Al-Harbi, Sales Manager', ['Q-2026-0417', 'SAR 48,500'], { monthsAgo: 1 }),
    ...ksaSet('jeddah', J, 'Rakan Al-Ghamdi, Sales Director', ['JOF-Q-2026-031', 'SAR 96,000'], { daysAgo: 12 }),
    { key: 'bright-trade-licence', title: 'Trade licence', docType: 'trade-licence', vendor: 'bright', expiry: 'company', legible: true, stamped: true, fields: { 'Licence number': B.company.regNumber, 'Legal name': B.company.legalName, 'Legal name (AR)': B.company.legalNameAr, 'Issue date': B.company.issueDate, 'Expiry date': B.company.expiryDate, Emirate: B.company.city } },
    { key: 'bright-vat', title: 'TRN certificate', docType: 'vat', vendor: 'bright', legible: true, stamped: true, fields: { TRN: B.tax.vatNumber, 'Legal name': B.company.legalName } },
    { key: 'bright-bank-letter-old', title: 'Bank letter (8 months old)', docType: 'bank-letter', vendor: 'bright', issued: { monthsAgo: 8 }, legible: true, stamped: true, fields: { IBAN: B.bank.iban, 'Account holder': B.bank.accountHolder, Bank: B.bank.bankName } },
    { key: 'bright-bank-letter-new', title: 'Bank letter', docType: 'bank-letter', vendor: 'bright', issued: { daysAgo: 6 }, legible: true, stamped: true, fields: { IBAN: B.bank.iban, 'Account holder': B.bank.accountHolder, Bank: B.bank.bankName } },
    { key: 'bright-quotation', title: 'Signed quotation', docType: 'quotation', vendor: 'bright', legible: true, stamped: true, fields: { 'Quotation no.': 'BD-Q-1182', Total: 'AED 112,000', 'Signed by': 'Priya Nair' } },
    { key: 'nile-commercial-register', title: 'Commercial register', docType: 'commercial-register', vendor: 'nile', expiry: 'company', legible: true, stamped: true, fields: { 'Register number': N.company.regNumber, 'Legal name': N.company.legalName, 'Legal name (AR)': N.company.legalNameAr, 'Issue date': N.company.issueDate, 'Expiry date': N.company.expiryDate, Governorate: N.company.city } },
    { key: 'nile-tax-card', title: 'Tax card', docType: 'tax-card', vendor: 'nile', legible: true, stamped: true, fields: { 'Tax registration': N.tax.vatNumber, 'Legal name': N.company.legalName, 'Tax office': 'Maadi tax office' } },
    { key: 'nile-vat', title: 'VAT certificate', docType: 'vat', vendor: 'nile', legible: true, stamped: true, fields: { 'Tax registration': N.tax.vatNumber, 'Legal name': N.company.legalName } },
    { key: 'nile-bank-letter', title: 'Bank letter', docType: 'bank-letter', vendor: 'nile', issued: { daysAgo: 20 }, legible: true, stamped: true, fields: { IBAN: N.bank.iban, 'Account holder': N.bank.accountHolder, Bank: N.bank.bankName } },
    { key: 'nile-quotation', title: 'Signed quotation', docType: 'quotation', vendor: 'nile', legible: true, stamped: true, fields: { 'Quotation no.': 'NG-2026-089', Total: 'EGP 185,000', 'Signed by': 'Mona Fathy' } },
    { key: 'nile-einvoice', title: 'E-invoice registration', docType: 'e-invoice', vendor: 'nile', legible: true, stamped: true, fields: { 'Tax registration': N.tax.vatNumber, 'E-invoice status': 'Registered' } },
    ...gccSet('kw', 'Commercial licence', false, true),
    ...gccSet('qa', 'Commercial registration', false, true),
    ...gccSet('bh', 'Commercial registration', true, false),
    ...gccSet('om', 'Commercial registration', true, false),
    { key: 'sample-blurry', title: 'Blurry scan', docType: 'any', legible: false, stamped: true, fields: {} },
    { key: 'sample-invoice', title: 'Tax invoice', docType: 'invoice', legible: true, stamped: true, fields: { 'Invoice no.': 'INV-0931' } },
    { key: 'sample-unstamped', title: 'Unstamped copy', docType: 'any', legible: true, stamped: false, fields: {} },
  ] as SampleDoc[]).map((d) => [d.key, d]),
);

/** Friendly file names in the sample documents folder → catalogue key. */
export const SAMPLE_FILES: [string, string][] = [
  ['alnoor-registration-form', '1 Vendor registration form'], ['alnoor-cr', '2 Commercial registration (CR)'], ['alnoor-vat', '3 VAT certificate'], ['alnoor-bank-letter', '4 Bank letter'], ['alnoor-quotation', '5 Signed quotation'],
  ['bright-trade-licence', '1 Trade licence'], ['bright-vat', '2 TRN certificate'], ['bright-bank-letter-old', '3a Bank letter - 8 months old (fails)'], ['bright-bank-letter-new', '3b Bank letter - new (passes)'], ['bright-quotation', '4 Signed quotation'],
  ['nile-commercial-register', '1 Commercial register'], ['nile-tax-card', '2 Tax card'], ['nile-vat', '3 VAT certificate'], ['nile-bank-letter', '4 Bank letter'], ['nile-quotation', '5 Signed quotation'], ['nile-einvoice', '6 E-invoice registration'],
  ['kw-registration-form', '1 Vendor registration form'], ['kw-cr', '2 Commercial licence'], ['kw-bank-letter', '3 Bank letter'], ['kw-quotation', '4 Signed quotation'],
  ['qa-registration-form', '1 Vendor registration form'], ['qa-cr', '2 Commercial registration (CR)'], ['qa-tax-card', '3 Tax card'], ['qa-bank-letter', '4 Bank letter'], ['qa-quotation', '5 Signed quotation'],
  ['bh-cr', '1 Commercial registration (CR)'], ['bh-vat', '2 VAT certificate (NBR)'], ['bh-bank-letter', '3 Bank letter'], ['bh-quotation', '4 Signed quotation'],
  ['om-cr', '1 Commercial registration (CR)'], ['om-vat', '2 VAT certificate (OTA)'], ['om-bank-letter', '3 Bank letter'], ['om-quotation', '4 Signed quotation'],
  ['jeddah-registration-form', '1 Vendor registration form'], ['jeddah-cr', '2 Commercial registration (CR)'], ['jeddah-vat', '3 VAT certificate'], ['jeddah-bank-letter', '4 Bank letter'], ['jeddah-quotation', '5 Signed quotation'],
  ['sample-blurry', 'Blurry scan (illegible)'], ['sample-unstamped', 'Unstamped copy (no stamp or signature)'], ['sample-invoice', 'Tax invoice (wrong document type)'], ['bright-bank-letter-old', 'Bank letter dated 8 months ago'],
];

const norm = (s: string) => s.toLowerCase().replace(/\.(pdf|png|jpe?g)$/i, '').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Resolves an uploaded file name to a catalogue key. Generic names ("4 Bank letter") exist in several folders, so the
 * vendor's own set wins; otherwise the first match. Returns null when nothing is recognised.
 */
export function resolveSampleKey(fileName: string, vendorKey?: SampleCompany['key']): string | null {
  const n = norm(fileName);
  if (!n) return null;
  const hits = SAMPLE_FILES.filter(([, friendly]) => norm(friendly) === n).map(([key]) => key);
  if (hits.length) return hits.find((k) => vendorKey && SAMPLE_DOCS[k]?.vendor === vendorKey) ?? hits[0];
  const byKey = Object.keys(SAMPLE_DOCS).find((k) => n.includes(k.replace(/-/g, ' ')) || n.replace(/ /g, '-').includes(k));
  return byKey ?? null;
}

const gcc = (k: string) => ({ 'registration-form': `${k}-registration-form`, cr: `${k}-cr`, vat: `${k}-vat`, 'tax-card': `${k}-tax-card`, 'bank-letter': `${k}-bank-letter`, quotation: `${k}-quotation` });
const DEFAULTS: Record<SampleCompany['key'], Record<string, string>> = {
  alnoor: { 'registration-form': 'alnoor-registration-form', cr: 'alnoor-cr', vat: 'alnoor-vat', 'bank-letter': 'alnoor-bank-letter', quotation: 'alnoor-quotation' },
  jeddah: { 'registration-form': 'jeddah-registration-form', cr: 'jeddah-cr', vat: 'jeddah-vat', 'bank-letter': 'jeddah-bank-letter', quotation: 'jeddah-quotation' },
  bright: { 'trade-licence': 'bright-trade-licence', vat: 'bright-vat', 'bank-letter': 'bright-bank-letter-new', quotation: 'bright-quotation' },
  nile: { 'commercial-register': 'nile-commercial-register', 'tax-card': 'nile-tax-card', vat: 'nile-vat', 'bank-letter': 'nile-bank-letter', quotation: 'nile-quotation', 'e-invoice': 'nile-einvoice' },
  kw: gcc('kw'), qa: gcc('qa'), bh: gcc('bh'), om: gcc('om'),
};
export function defaultSampleKey(vendorKey: SampleCompany['key'], slotId: string): string {
  return DEFAULTS[vendorKey][slotId] ?? DEFAULTS[vendorKey].cr ?? 'sample-unstamped';
}

export interface VendorFields { company: { legalName: string; legalNameAr: string; regNumber: string; expiryDate: string; city: string }; tax: { vatNumber: string }; bank: { iban: string; accountHolder: string; bankName: string }; contacts: { sales: { name: string } } }

/** Turns a catalogue entry into the ExtractionResult the rules engine consumes, filling {tokens} from the vendor's form. */
export function toExtraction(sample: SampleDoc, v?: VendorFields, company?: SampleCompany): ExtractionResult {
  const map: Record<string, string> = v ? { legalName: v.company.legalName, legalNameAr: v.company.legalNameAr, regNumber: v.company.regNumber, expiryDate: v.company.expiryDate, city: v.company.city, vatNumber: v.tax.vatNumber || 'n/a', iban: v.bank.iban, accountHolder: v.bank.accountHolder, bankName: v.bank.bankName, salesName: v.contacts.sales.name } : {};
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? '');
  const issuedDate = sample.issued ? (sample.issued.monthsAgo !== undefined ? monthsAgo(sample.issued.monthsAgo) : daysAgo(sample.issued.daysAgo ?? 0)) : undefined;
  const expiryDate = sample.expiry === 'company' ? (v?.company.expiryDate || company?.company.expiryDate) : sample.expiry;
  return { docType: sample.docType, legible: sample.legible, stamped: sample.stamped, issuedDate, expiryDate: expiryDate || undefined, fields: Object.fromEntries(Object.entries(sample.fields).map(([k, val]) => [k, fill(val)])), confidence: 0.99 };
}
