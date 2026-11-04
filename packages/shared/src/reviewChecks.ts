import type { CheckLevel, DocumentRecord, RegistryCheck, ReviewCheck, ReviewSummary, SapVendor, Vendor } from './types.js';
import { validateIban } from './iban.js';
import { namesMatch, registrationNotExpired, countryIbanPrefix } from './rules.js';
import { findDuplicates, MATCH_LABELS } from './duplicates.js';
import { COUNTRIES } from './countries.js';

/**
 * The review-screen checks. Pure function of the vendor record, its documents, the registry results and the SAP list.
 * The API computes it for every vendor detail; the web renders it. Nothing here calls the network.
 */
export function reviewChecks(v: Vendor, docs: DocumentRecord[], registry: RegistryCheck[], sapVendors: SapVendor[], bankLetterMaxMonths = 6): ReviewSummary {
  const checks: ReviewCheck[] = [];
  const profile = COUNTRIES[v.country];

  const iban = validateIban(v.bank.iban, countryIbanPrefix(v.country));
  checks.push({ id: 'iban', label: 'IBAN checksum', level: iban.ok ? 'pass' : 'fail', reason: iban.ok ? `Valid mod-97 · ${iban.iban}` : iban.message, fixEn: iban.ok ? undefined : 'The IBAN does not pass the checksum. Please re-enter it exactly as shown on the bank letter.', fixAr: iban.ok ? undefined : 'رقم الآيبان لا يجتاز فحص التحقق. يرجى إدخاله كما هو في خطاب البنك تمامًا.' });

  const holderOk = namesMatch(v.bank.accountHolder, v.company.legalName);
  checks.push({ id: 'holder', label: 'Account holder matches legal name', level: holderOk ? 'pass' : 'flag', reason: holderOk ? `"${v.bank.accountHolder}" ≈ "${v.company.legalName}"` : `Bank letter says "${v.bank.accountHolder}", registration says "${v.company.legalName}"`, fixEn: holderOk ? undefined : "The bank account holder name must match the registered legal name. Please upload a bank letter in the company's legal name.", fixAr: holderOk ? undefined : 'يجب أن يطابق اسم صاحب الحساب البنكي الاسم القانوني المسجّل. يرجى رفع خطاب بنك باسم الشركة القانوني.' });

  const docNames = docs.map((d) => d.extracted['Legal name']).filter(Boolean);
  const namesOk = docNames.every((n) => namesMatch(n, v.company.legalName));
  checks.push({ id: 'names', label: 'Names match across documents', level: docNames.length === 0 ? 'pending' : namesOk ? 'pass' : 'flag', reason: docNames.length === 0 ? 'No names read from documents yet' : namesOk ? `Consistent across ${docNames.length} documents (Arabic/English normalised)` : 'A document carries a different company name' });

  const notExpired = v.company.expiryDate ? registrationNotExpired(v.company.expiryDate) : false;
  checks.push({ id: 'expiry', label: 'Registration not expired', level: v.company.expiryDate ? (notExpired ? 'pass' : 'fail') : 'pending', reason: v.company.expiryDate ? (notExpired ? `Valid until ${v.company.expiryDate}` : `Expired on ${v.company.expiryDate}`) : 'No expiry date', fixEn: notExpired ? undefined : 'Your commercial registration has expired. Please renew it and upload the new certificate.', fixAr: notExpired ? undefined : 'انتهت صلاحية السجل التجاري. يرجى تجديده ورفع الشهادة الجديدة.' });

  const bank = docs.find((d) => d.slotId === 'bank-letter');
  const bankDate = bank?.checks.find((c) => c.id === 'date');
  checks.push({ id: 'bankLetter', label: `Bank letter ${bankLetterMaxMonths} months old or less`, level: bankDate ? bankDate.level : 'pending', reason: bankDate ? bankDate.reason : 'Not uploaded yet', fixEn: bankDate?.level === 'fail' ? bankDate.reason : undefined, fixAr: bankDate?.level === 'fail' ? bankDate.reasonAr : undefined });

  const reg = registry.find((r) => r.kind === 'company');
  checks.push({ id: 'registry', label: `${profile.registry} registration lookup`, level: reg ? (reg.status === 'manual' ? 'flag' : reg.status) : 'pending', reason: reg ? reg.summary : 'Not checked yet', simulated: reg?.provider === 'simulated' });

  const tax = registry.find((r) => r.kind === 'tax');
  if (profile.tax.applicable) checks.push({ id: 'tax', label: `${profile.tax.authority} tax number`, level: tax ? (tax.status === 'manual' ? 'flag' : tax.status) : 'pending', reason: tax ? tax.summary : 'Not checked yet', simulated: tax?.provider === 'simulated' });

  const duplicates = findDuplicates(v, sapVendors);
  const d = duplicates[0];
  checks.push({
    id: 'duplicate',
    label: 'Duplicate check against SAP vendor list',
    level: d ? 'flag' : 'pass',
    reason: d ? `Possible match: SAP vendor ${d.sap.code} "${d.sap.name}" · same ${d.on.map((m) => MATCH_LABELS[m]).join(' and ')}` : `No match across ${sapVendors.length} existing vendors (registration, tax, IBAN, normalised name)`,
    fixEn: d ? `Our records show an existing MAGRABi vendor account (${d.sap.code}, "${d.sap.name}") with the same ${d.on.map((m) => MATCH_LABELS[m]).join(' and ')}. If this is the same company, please reply with your existing vendor code so we can update that account instead of creating a new one. If it is a different legal entity, please upload a document that shows the distinct tax registration.` : undefined,
    fixAr: d ? `تُظهر سجلاتنا وجود حساب مورّد قائم لدى مغربي (${d.sap.code}، "${d.sap.name}") بنفس البيانات. إذا كانت هذه الشركة نفسها، يرجى تزويدنا برمز المورّد الحالي حتى نحدّث ذلك الحساب بدلًا من إنشاء حساب جديد. وإذا كانت جهة قانونية مختلفة، يرجى رفع مستند يوضح رقم التسجيل الضريبي المختلف.` : undefined,
  });

  const sanc = registry.find((r) => r.kind === 'sanctions');
  checks.push({ id: 'sanctions', label: 'Sanctions screen', level: sanc ? (sanc.status === 'manual' ? 'flag' : sanc.status) : 'pending', reason: sanc ? sanc.summary : 'Not screened yet', simulated: sanc?.provider === 'simulated' });

  const slots = profile.checklist;
  const docsPassed = slots.filter((s) => docs.find((x) => x.slotId === s.id)?.level === 'pass').length;
  return { checks, passed: checks.filter((c) => c.level === 'pass').length, flags: checks.filter((c) => c.level === 'flag').length, fails: checks.filter((c) => c.level === 'fail').length, docsPassed, docsTotal: slots.length };
}

export function checkSummaryText(s: ReviewSummary): { text: string; level: CheckLevel } {
  const issues = s.flags + s.fails;
  if (issues === 0 && s.checks.some((c) => c.level === 'pending')) return { text: 'Checks running', level: 'pending' };
  if (issues === 0) return { text: `${s.checks.length} of ${s.checks.length} checks passed`, level: 'pass' };
  return { text: `${issues} ${issues === 1 ? 'flag' : 'flags'}`, level: s.fails ? 'fail' : 'flag' };
}

export const STATUS_LABEL: Record<Vendor['status'], string> = { invited: 'Invited', draft: 'In progress', submitted: 'Submitted', in_review: 'In review', returned: 'Returned to vendor', approved: 'Approved', code_issued: 'Vendor code issued', rejected: 'Rejected', expired: 'Invite expired' };
export const STATUS_LEVEL: Record<Vendor['status'], CheckLevel> = { invited: 'pending', draft: 'pending', submitted: 'flag', in_review: 'flag', returned: 'fail', approved: 'pass', code_issued: 'pass', rejected: 'fail', expired: 'pending' };
