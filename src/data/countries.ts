// One place for everything that differs by country. Procurement should validate these rules before go-live;
// they are a sensible starting point, not a legal reference. Edit here and the whole app follows.
import type { Country } from '@/lib/types';

export interface ChecklistItem {
  id: string;
  label: string;
  labelAr: string;
  hint?: string;
  hintAr?: string;
  docType: string;
}

export interface TaxRule {
  applicable: boolean; // false = no VAT regime (Kuwait, Qatar): field is optional
  label: string;
  labelAr: string;
  authority: string; // simulated registry name
  pattern: RegExp;
  format: string; // human description, English
  formatAr: string;
  example: string;
}

export interface CountryProfile {
  code: Country;
  name: string;
  nameAr: string;
  flag: string;
  currency: string;
  ibanPrefix: string;
  registry: string; // simulated company registry
  regLabel: string;
  regLabelAr: string;
  regExample: string;
  tax: TaxRule;
  checklist: ChecklistItem[];
  companyCode: string; // SAP placeholder
  bankLetterMaxMonths: number;
  notes: string; // shown on the Country rules page
}

const REGISTRATION_FORM: ChecklistItem = { id: 'registration-form', label: 'Vendor registration form', labelAr: 'نموذج تسجيل المورّد', hint: 'Signed and stamped.', hintAr: 'موقّع ومختوم.', docType: 'registration-form' };
const CR = (label: string, labelAr: string, id = 'cr'): ChecklistItem => ({ id, label, labelAr, docType: id });
const VAT = (label = 'VAT certificate', labelAr = 'شهادة ضريبة القيمة المضافة'): ChecklistItem => ({ id: 'vat', label, labelAr, docType: 'vat' });
const BANK_LETTER: ChecklistItem = { id: 'bank-letter', label: 'Bank letter', labelAr: 'خطاب البنك', hint: 'Stamped by the bank and issued within the last 6 months.', hintAr: 'مختوم من البنك وصادر خلال آخر 6 أشهر.', docType: 'bank-letter' };
const QUOTATION: ChecklistItem = { id: 'quotation', label: 'Signed quotation or contract', labelAr: 'عرض سعر أو عقد موقّع', hint: 'A signed quotation or contract is enough. We never ask for an invoice before the PO.', hintAr: 'عرض السعر أو العقد الموقّع يكفي. لا نطلب فاتورة قبل أمر الشراء.', docType: 'quotation' };

export const COUNTRIES: Record<Country, CountryProfile> = {
  KSA: {
    code: 'KSA', name: 'Saudi Arabia', nameAr: 'السعودية', flag: '🇸🇦', currency: 'SAR', ibanPrefix: 'SA', registry: 'Wathq',
    regLabel: 'Commercial registration (CR) number', regLabelAr: 'رقم السجل التجاري', regExample: '1010567890',
    tax: { applicable: true, label: 'VAT number', labelAr: 'الرقم الضريبي', authority: 'ZATCA', pattern: /^3\d{13}3$/, format: '15 digits, starts and ends with 3', formatAr: '15 رقمًا يبدأ وينتهي بالرقم 3', example: '300567890123453' },
    checklist: [REGISTRATION_FORM, CR('Commercial registration (CR)', 'السجل التجاري'), VAT(), BANK_LETTER, QUOTATION],
    companyCode: '1000', bankLetterMaxMonths: 6,
    notes: 'CR is verified against Wathq. VAT registration is mandatory above the threshold; most trade vendors have one.',
  },
  UAE: {
    code: 'UAE', name: 'United Arab Emirates', nameAr: 'الإمارات', flag: '🇦🇪', currency: 'AED', ibanPrefix: 'AE', registry: 'DED',
    regLabel: 'Trade licence number', regLabelAr: 'رقم الرخصة التجارية', regExample: 'CN-7654321',
    tax: { applicable: true, label: 'TRN (tax registration number)', labelAr: 'رقم التسجيل الضريبي (TRN)', authority: 'FTA', pattern: /^100\d{12}$/, format: '15 digits, starts with 100', formatAr: '15 رقمًا يبدأ بـ 100', example: '100765432100003' },
    checklist: [CR('Trade licence', 'الرخصة التجارية', 'trade-licence'), VAT('VAT / TRN certificate', 'شهادة التسجيل الضريبي (TRN)'), BANK_LETTER, QUOTATION],
    companyCode: '2000', bankLetterMaxMonths: 6,
    notes: 'Trade licences are issued per emirate (DED, free zones). The TRN certificate is the tax document.',
  },
  EG: {
    code: 'EG', name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬', currency: 'EGP', ibanPrefix: 'EG', registry: 'GAFI',
    regLabel: 'Commercial register number', regLabelAr: 'رقم السجل التجاري', regExample: '76598',
    tax: { applicable: true, label: 'Tax registration number', labelAr: 'رقم التسجيل الضريبي', authority: 'ETA', pattern: /^\d{3}-?\d{3}-?\d{3}$/, format: '9 digits (xxx-xxx-xxx)', formatAr: '9 أرقام (xxx-xxx-xxx)', example: '345-678-912' },
    checklist: [CR('Commercial register', 'السجل التجاري', 'commercial-register'), { id: 'tax-card', label: 'Tax card', labelAr: 'البطاقة الضريبية', docType: 'tax-card' }, VAT(), BANK_LETTER, QUOTATION, { id: 'e-invoice', label: 'E-invoice registration', labelAr: 'تسجيل الفاتورة الإلكترونية', docType: 'e-invoice' }],
    companyCode: '3000', bankLetterMaxMonths: 6,
    notes: 'Egypt needs both the tax card and the VAT certificate, plus proof of e-invoice registration with the ETA.',
  },
  KW: {
    code: 'KW', name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼', currency: 'KWD', ibanPrefix: 'KW', registry: 'MOCI',
    regLabel: 'Commercial licence number', regLabelAr: 'رقم الترخيص التجاري', regExample: '2024-11234',
    tax: { applicable: false, label: 'Tax ID (if applicable)', labelAr: 'الرقم الضريبي (إن وجد)', authority: 'MOF', pattern: /^\d{6,12}$/, format: 'No VAT in Kuwait. Optional 6–12 digit tax ID.', formatAr: 'لا توجد ضريبة قيمة مضافة في الكويت. رقم ضريبي اختياري من 6 إلى 12 رقمًا.', example: '' },
    checklist: [REGISTRATION_FORM, CR('Commercial licence', 'الترخيص التجاري'), BANK_LETTER, QUOTATION],
    companyCode: '4000', bankLetterMaxMonths: 6,
    notes: 'No VAT regime. The commercial licence from MOCI is the identity document; no tax certificate is requested.',
  },
  QA: {
    code: 'QA', name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦', currency: 'QAR', ibanPrefix: 'QA', registry: 'MOCI',
    regLabel: 'Commercial registration (CR) number', regLabelAr: 'رقم السجل التجاري', regExample: '154321',
    tax: { applicable: false, label: 'Tax card number (if applicable)', labelAr: 'رقم البطاقة الضريبية (إن وجد)', authority: 'GTA', pattern: /^\d{8,12}$/, format: 'No VAT yet. Optional tax card number (8–12 digits).', formatAr: 'لا توجد ضريبة قيمة مضافة بعد. رقم بطاقة ضريبية اختياري (8–12 رقمًا).', example: '' },
    checklist: [REGISTRATION_FORM, CR('Commercial registration (CR)', 'السجل التجاري'), { id: 'tax-card', label: 'Tax card (if registered)', labelAr: 'البطاقة الضريبية (إن وجدت)', docType: 'tax-card' }, BANK_LETTER, QUOTATION],
    companyCode: '5000', bankLetterMaxMonths: 6,
    notes: 'No VAT yet. Tax card is requested where the vendor holds one. CR issued by MOCI.',
  },
  BH: {
    code: 'BH', name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭', currency: 'BHD', ibanPrefix: 'BH', registry: 'Sijilat',
    regLabel: 'Commercial registration (CR) number', regLabelAr: 'رقم السجل التجاري', regExample: '98765-1',
    tax: { applicable: true, label: 'VAT account number', labelAr: 'رقم حساب ضريبة القيمة المضافة', authority: 'NBR', pattern: /^2\d{14}$/, format: '15 digits, starts with 2', formatAr: '15 رقمًا يبدأ بـ 2', example: '200012345600002' },
    checklist: [CR('Commercial registration (CR)', 'السجل التجاري'), VAT('VAT certificate (NBR)', 'شهادة ضريبة القيمة المضافة'), BANK_LETTER, QUOTATION],
    companyCode: '6000', bankLetterMaxMonths: 6,
    notes: 'CR verified against Sijilat. VAT at 10%; the NBR certificate carries the VAT account number.',
  },
  OM: {
    code: 'OM', name: 'Oman', nameAr: 'عُمان', flag: '🇴🇲', currency: 'OMR', ibanPrefix: 'OM', registry: 'MOCIIP',
    regLabel: 'Commercial registration (CR) number', regLabelAr: 'رقم السجل التجاري', regExample: '1234567',
    tax: { applicable: true, label: 'VAT identification number (VATIN)', labelAr: 'رقم التعريف الضريبي (VATIN)', authority: 'OTA', pattern: /^OM\d{10}$/i, format: 'OM followed by 10 digits', formatAr: 'OM متبوعة بـ 10 أرقام', example: 'OM1100012345' },
    checklist: [CR('Commercial registration (CR)', 'السجل التجاري'), VAT('VAT certificate (OTA)', 'شهادة ضريبة القيمة المضافة'), BANK_LETTER, QUOTATION],
    companyCode: '7000', bankLetterMaxMonths: 6,
    notes: 'CR from MOCIIP (Invest Easy). VAT at 5%; the VATIN starts with OM.',
  },
};

export const COUNTRY_ORDER: Country[] = ['KSA', 'UAE', 'EG', 'KW', 'QA', 'BH', 'OM'];

export const CATEGORIES = ['Printing & signage', 'Store fixtures & displays', 'Marketing & promotions', 'Facilities & maintenance', 'IT & software', 'Logistics', 'Professional services'];

export const CATEGORY_AR: Record<string, string> = {
  'Printing & signage': 'الطباعة واللافتات',
  'Store fixtures & displays': 'تجهيزات المتاجر والعرض',
  'Marketing & promotions': 'التسويق والدعاية',
  'Facilities & maintenance': 'المرافق والصيانة',
  'IT & software': 'تقنية المعلومات والبرمجيات',
  'Logistics': 'الخدمات اللوجستية',
  'Professional services': 'الخدمات المهنية',
};

export function categoryLabel(category: string, lang: 'en' | 'ar'): string {
  return lang === 'ar' ? CATEGORY_AR[category] ?? category : category;
}

export function profile(country: Country): CountryProfile {
  return COUNTRIES[country];
}
