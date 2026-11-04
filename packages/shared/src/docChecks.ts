import type { CheckLevel, DocCheck } from './types.js';
import type { ChecklistItem } from './countries.js';
import { monthsBetween, registrationNotExpired } from './rules.js';

/** What an extraction step tells us about a document, independent of how it was read (AI, demo catalogue, manual). */
export interface ExtractionResult {
  docType: string; // recognised type, 'any' if unsure, 'unknown' if nothing recognised
  legible: boolean;
  stamped: boolean;
  issuedDate?: string;
  expiryDate?: string;
  fields: Record<string, string>;
  confidence?: number;
}

const DATE_RULE_TYPES = new Set(['cr', 'trade-licence', 'commercial-register']);

export function worstLevel(levels: CheckLevel[]): CheckLevel {
  if (levels.includes('fail')) return 'fail';
  if (levels.includes('flag')) return 'flag';
  if (levels.includes('pending')) return 'pending';
  return 'pass';
}

/** Turns an extraction result into the four instant checks a vendor sees at upload. Pure, deterministic. */
export function runDocChecks(slot: ChecklistItem, r: ExtractionResult, bankLetterMaxMonths: number, today = new Date().toISOString()): DocCheck[] {
  const typeOk = r.docType === 'any' || r.docType === slot.docType;
  const unsure = r.docType === 'unknown';
  const checks: DocCheck[] = [
    {
      id: 'type',
      level: unsure ? 'flag' : typeOk ? 'pass' : 'fail',
      label: 'Document type',
      labelAr: 'نوع المستند',
      reason: unsure ? 'We could not confirm the document type. A person will check it.' : typeOk ? `Recognised as ${slot.label.toLowerCase()}` : `This looks like a different document, not a ${slot.label.toLowerCase()}.${r.docType === 'invoice' ? ' A signed quotation or contract is enough; no invoice is needed before the PO.' : ''}`,
      reasonAr: unsure ? 'لم نتمكن من تأكيد نوع المستند. سيتحقق منه شخص مختص.' : typeOk ? `تم التعرّف عليه كـ ${slot.labelAr}` : `يبدو أن هذا مستند مختلف وليس ${slot.labelAr}.${r.docType === 'invoice' ? ' عرض السعر أو العقد الموقّع يكفي، ولا حاجة لفاتورة قبل أمر الشراء.' : ''}`,
    },
    {
      id: 'legible',
      level: r.legible ? 'pass' : 'fail',
      label: 'Legible scan',
      labelAr: 'وضوح النسخة',
      reason: r.legible ? 'Text is clear and readable' : 'The scan is too blurry to read. Please upload a clearer copy or a photo in good light.',
      reasonAr: r.legible ? 'النص واضح ومقروء' : 'النسخة غير واضحة بما يكفي للقراءة. يرجى رفع نسخة أوضح أو صورة في إضاءة جيدة.',
    },
    {
      id: 'stamp',
      level: r.stamped ? 'pass' : 'fail',
      label: 'Stamp or signature',
      labelAr: 'الختم أو التوقيع',
      reason: r.stamped ? 'Stamp and signature detected' : "We couldn't find a stamp or signature. Please upload a stamped and signed copy.",
      reasonAr: r.stamped ? 'تم رصد الختم والتوقيع' : 'لم نجد ختمًا أو توقيعًا. يرجى رفع نسخة مختومة وموقّعة.',
    },
  ];
  if (slot.docType === 'bank-letter') {
    if (r.issuedDate) {
      const months = monthsBetween(r.issuedDate, today);
      const ok = months <= bankLetterMaxMonths;
      checks.push({ id: 'date', level: ok ? 'pass' : 'fail', label: 'Dates within policy', labelAr: 'التواريخ ضمن السياسة', reason: ok ? `Issued ${months === 0 ? 'this month' : `${months} month${months === 1 ? '' : 's'} ago`} · within the ${bankLetterMaxMonths}-month rule` : `This bank letter is dated ${months} months ago. Please upload one issued within the last ${bankLetterMaxMonths} months.`, reasonAr: ok ? `صادر ${months === 0 ? 'هذا الشهر' : `قبل ${months} أشهر`} · ضمن قاعدة ${bankLetterMaxMonths} أشهر` : `خطاب البنك هذا صادر قبل ${months} أشهر. يرجى رفع خطاب صادر خلال آخر ${bankLetterMaxMonths} أشهر.` });
    } else {
      checks.push({ id: 'date', level: 'flag', label: 'Dates within policy', labelAr: 'التواريخ ضمن السياسة', reason: 'We could not read the issue date. A person will check it.', reasonAr: 'لم نتمكن من قراءة تاريخ الإصدار. سيتحقق منه شخص مختص.' });
    }
  } else if (DATE_RULE_TYPES.has(slot.docType)) {
    if (r.expiryDate) {
      const ok = registrationNotExpired(r.expiryDate, today);
      checks.push({ id: 'date', level: ok ? 'pass' : 'fail', label: 'Dates within policy', labelAr: 'التواريخ ضمن السياسة', reason: ok ? `Valid until ${r.expiryDate}` : `This registration expired on ${r.expiryDate}. Please renew it first.`, reasonAr: ok ? `ساري حتى ${r.expiryDate}` : `انتهت صلاحية هذا السجل في ${r.expiryDate}. يرجى تجديده أولًا.` });
    } else {
      checks.push({ id: 'date', level: 'flag', label: 'Dates within policy', labelAr: 'التواريخ ضمن السياسة', reason: 'We could not read the expiry date. A person will check it.', reasonAr: 'لم نتمكن من قراءة تاريخ الانتهاء. سيتحقق منه شخص مختص.' });
    }
  } else {
    checks.push({ id: 'date', level: 'pass', label: 'Dates within policy', labelAr: 'التواريخ ضمن السياسة', reason: 'No date rule applies to this document', reasonAr: 'لا تنطبق قاعدة تاريخ على هذا المستند' });
  }
  if (!typeOk && !unsure) for (const c of checks) if (c.id !== 'type') c.level = 'pending';
  return checks;
}
