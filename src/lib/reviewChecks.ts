import type { CheckLevel, SapVendor, Vendor } from './types';
import { validateIban } from './iban';
import { namesMatch, registrationNotExpired, countryIbanPrefix } from './rules';
import { findDuplicates, MATCH_LABELS, type DuplicateMatch } from './duplicates';
import { CHECKLISTS } from '@/data/checklists';

export interface ReviewCheck {
  id: 'iban' | 'holder' | 'names' | 'expiry' | 'bankLetter' | 'duplicate' | 'sanctions';
  label: string;
  level: CheckLevel;
  reason: string;
  simulated?: boolean;
  fixEn?: string;
  fixAr?: string;
}

export interface ReviewSummary {
  checks: ReviewCheck[];
  passed: number;
  flags: number;
  fails: number;
  duplicates: DuplicateMatch[];
  docsPassed: number;
  docsTotal: number;
}

export function reviewChecks(v: Vendor, sapVendors: SapVendor[]): ReviewSummary {
  const checks: ReviewCheck[] = [];
  const iban = validateIban(v.bank.iban, countryIbanPrefix(v.country));
  checks.push({ id: 'iban', label: 'IBAN checksum', level: iban.ok ? 'pass' : 'fail', reason: iban.ok ? `Valid mod-97 · ${iban.iban}` : iban.message, fixEn: iban.ok ? undefined : 'The IBAN does not pass the checksum. Please re-enter it exactly as shown on the bank letter.', fixAr: iban.ok ? undefined : 'رقم الآيبان لا يجتاز فحص التحقق. يرجى إدخاله كما هو في خطاب البنك تمامًا.' });

  const holderOk = namesMatch(v.bank.accountHolder, v.company.legalName);
  checks.push({ id: 'holder', label: 'Account holder matches legal name', level: holderOk ? 'pass' : 'flag', reason: holderOk ? `"${v.bank.accountHolder}" ≈ "${v.company.legalName}"` : `Bank letter says "${v.bank.accountHolder}", registration says "${v.company.legalName}"`, fixEn: holderOk ? undefined : 'The bank account holder name must match the registered legal name. Please upload a bank letter in the company\'s legal name.', fixAr: holderOk ? undefined : 'يجب أن يطابق اسم صاحب الحساب البنكي الاسم القانوني المسجّل. يرجى رفع خطاب بنك باسم الشركة القانوني.' });

  const docNames = Object.values(v.documents).map((d) => d.extracted['Legal name']).filter(Boolean);
  const namesOk = docNames.every((n) => namesMatch(n, v.company.legalName));
  checks.push({ id: 'names', label: 'Names match across documents', level: docNames.length === 0 ? 'pending' : namesOk ? 'pass' : 'flag', reason: docNames.length === 0 ? 'No documents yet' : namesOk ? `Consistent across ${docNames.length} documents (Arabic/English normalised)` : 'A document carries a different company name' });

  const notExpired = v.company.expiryDate ? registrationNotExpired(v.company.expiryDate) : false;
  checks.push({ id: 'expiry', label: 'Registration not expired', level: v.company.expiryDate ? (notExpired ? 'pass' : 'fail') : 'pending', reason: v.company.expiryDate ? (notExpired ? `Valid until ${v.company.expiryDate}` : `Expired on ${v.company.expiryDate}`) : 'No expiry date', fixEn: notExpired ? undefined : 'Your commercial registration has expired. Please renew it and upload the new certificate.', fixAr: notExpired ? undefined : 'انتهت صلاحية السجل التجاري. يرجى تجديده ورفع الشهادة الجديدة.' });

  const bank = v.documents['bank-letter'];
  const bankDate = bank?.checks.find((c) => c.id === 'date');
  checks.push({ id: 'bankLetter', label: 'Bank letter 6 months old or less', level: bankDate ? bankDate.level : 'pending', reason: bankDate ? bankDate.reason : 'Not uploaded yet', fixEn: bankDate?.level === 'fail' ? bankDate.reason : undefined, fixAr: bankDate?.level === 'fail' ? bankDate.reasonAr : undefined });

  const duplicates = findDuplicates(v, sapVendors);
  const d = duplicates[0];
  checks.push({
    id: 'duplicate',
    label: 'Duplicate check against SAP vendor list',
    level: d ? 'flag' : 'pass',
    reason: d ? `Possible match: SAP vendor ${d.sap.code} "${d.sap.name}" · same ${d.on.map((m) => MATCH_LABELS[m]).join(' and ')}` : `No match across ${sapVendors.length} existing vendors (registration, tax, IBAN, normalised name)`,
    simulated: true,
    fixEn: d ? `Our records show an existing MAGRABi vendor account (${d.sap.code}, "${d.sap.name}") with the same ${d.on.map((m) => MATCH_LABELS[m]).join(' and ')}. If this is the same company, please reply with your existing vendor code so we can update that account instead of creating a new one. If it is a different legal entity, please upload a document that shows the distinct tax registration.` : undefined,
    fixAr: d ? `تُظهر سجلاتنا وجود حساب مورّد قائم لدى مغربي (${d.sap.code}، "${d.sap.name}") بنفس ${d.on.includes('vat') ? 'رقم التسجيل الضريبي' : 'البيانات'}. إذا كانت هذه الشركة نفسها، يرجى تزويدنا برمز المورّد الحالي حتى نحدّث ذلك الحساب بدلًا من إنشاء حساب جديد. وإذا كانت جهة قانونية مختلفة، يرجى رفع مستند يوضح رقم التسجيل الضريبي المختلف.` : undefined,
  });

  checks.push({ id: 'sanctions', label: 'Sanctions screen', level: 'pass', reason: 'Clear · UN, OFAC, EU and local lists', simulated: true });

  const slots = CHECKLISTS[v.country];
  const docsPassed = slots.filter((s) => v.documents[s.id]?.level === 'pass').length;
  return {
    checks,
    passed: checks.filter((c) => c.level === 'pass').length,
    flags: checks.filter((c) => c.level === 'flag').length,
    fails: checks.filter((c) => c.level === 'fail').length,
    duplicates,
    docsPassed,
    docsTotal: slots.length,
  };
}

export function checkSummaryText(s: ReviewSummary): { text: string; level: CheckLevel } {
  const issues = s.flags + s.fails;
  if (issues === 0) return { text: `${s.checks.length} of ${s.checks.length} checks passed`, level: 'pass' };
  return { text: `${issues} ${issues === 1 ? 'flag' : 'flags'}`, level: s.fails ? 'fail' : 'flag' };
}

export const STATUS_LABEL: Record<Vendor['status'], string> = {
  invited: 'Invited',
  draft: 'In progress',
  submitted: 'Submitted',
  in_review: 'In review',
  returned: 'Returned to vendor',
  approved: 'Approved',
  code_issued: 'Vendor code issued',
};

export const STATUS_LEVEL: Record<Vendor['status'], CheckLevel> = {
  invited: 'pending',
  draft: 'pending',
  submitted: 'flag',
  in_review: 'flag',
  returned: 'fail',
  approved: 'pass',
  code_issued: 'pass',
};
