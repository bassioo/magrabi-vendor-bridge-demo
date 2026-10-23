// Real mod-97 IBAN validation for SA, AE and EG formats.
// Reference: ISO 13616. Length and BBAN shape per country.

export interface IbanSpec {
  length: number;
  pattern: RegExp; // pattern for the BBAN part (after country + check digits)
  label: string;
}

export const IBAN_SPECS: Record<string, IbanSpec> = {
  SA: { length: 24, pattern: /^\d{2}[A-Z0-9]{18}$/, label: 'Saudi Arabia · SA + 22 characters' },
  AE: { length: 23, pattern: /^\d{3}\d{16}$/, label: 'UAE · AE + 21 digits' },
  EG: { length: 29, pattern: /^\d{4}\d{4}\d{17}$/, label: 'Egypt · EG + 27 digits' },
  KW: { length: 30, pattern: /^[A-Z]{4}[A-Z0-9]{22}$/, label: 'Kuwait · KW + 2 check digits + 4-letter bank code + 22 characters' },
  QA: { length: 29, pattern: /^[A-Z]{4}[A-Z0-9]{21}$/, label: 'Qatar · QA + 2 check digits + 4-letter bank code + 21 characters' },
  BH: { length: 22, pattern: /^[A-Z]{4}[A-Z0-9]{14}$/, label: 'Bahrain · BH + 2 check digits + 4-letter bank code + 14 characters' },
  OM: { length: 23, pattern: /^\d{3}[A-Z0-9]{16}$/, label: 'Oman · OM + 2 check digits + 3-digit bank code + 16 characters' },
};
const COUNTRY_NAMES: Record<string, string> = { SA: 'Saudi', AE: 'UAE', EG: 'Egyptian', KW: 'Kuwaiti', QA: 'Qatari', BH: 'Bahraini', OM: 'Omani' };

export function normaliseIban(input: string): string {
  return (input || '').replace(/\s+/g, '').toUpperCase();
}

export function formatIban(input: string): string {
  return normaliseIban(input).replace(/(.{4})/g, '$1 ').trim();
}

/** Converts letters to numbers (A=10 … Z=35) and runs mod 97 on the rearranged string. */
export function ibanMod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    const piece = code >= 65 && code <= 90 ? String(code - 55) : ch;
    for (const d of piece) {
      remainder = (remainder * 10 + (d.charCodeAt(0) - 48)) % 97;
    }
  }
  return remainder;
}

export type IbanResult =
  | { ok: true; iban: string; country: string; bankCode: string }
  | { ok: false; iban: string; reason: 'empty' | 'country' | 'length' | 'format' | 'checksum'; message: string; messageAr: string };

export function validateIban(input: string, expectedCountry?: string): IbanResult {
  const iban = normaliseIban(input);
  if (!iban) {
    return { ok: false, iban, reason: 'empty', message: 'Please enter the IBAN.', messageAr: 'يرجى إدخال رقم الآيبان.' };
  }
  const country = iban.slice(0, 2);
  const spec = IBAN_SPECS[country];
  if (!spec || (expectedCountry && country !== expectedCountry)) {
    return {
      ok: false,
      iban,
      reason: 'country',
      message: expectedCountry
        ? `This IBAN should start with ${expectedCountry} for a ${COUNTRY_NAMES[expectedCountry] ?? expectedCountry} bank account.`
        : 'Only GCC and Egyptian IBANs are supported in this demo.',
      messageAr: expectedCountry
        ? `يجب أن يبدأ رقم الآيبان بـ ${expectedCountry} لحساب بنكي في هذا البلد.`
        : 'هذا العرض يدعم أرقام الآيبان الخليجية والمصرية فقط.',
    };
  }
  if (iban.length !== spec.length) {
    return {
      ok: false,
      iban,
      reason: 'length',
      message: `A ${country} IBAN has ${spec.length} characters. This one has ${iban.length}.`,
      messageAr: `رقم الآيبان لـ ${country} يتكوّن من ${spec.length} خانة، وهذا الرقم فيه ${iban.length}.`,
    };
  }
  if (!/^\d{2}$/.test(iban.slice(2, 4)) || !spec.pattern.test(iban.slice(4))) {
    return {
      ok: false,
      iban,
      reason: 'format',
      message: `This does not match the ${spec.label} format.`,
      messageAr: `الرقم لا يطابق الصيغة المتوقعة (${spec.label}).`,
    };
  }
  if (ibanMod97(iban) !== 1) {
    return {
      ok: false,
      iban,
      reason: 'checksum',
      message: 'The IBAN checksum does not add up. One or more digits look mistyped. Please check against the bank letter.',
      messageAr: 'رقم الآيبان لا يجتاز فحص التحقق. يبدو أن هناك خانة أو أكثر مكتوبة بشكل خاطئ. يرجى مراجعته مع خطاب البنك.',
    };
  }
  const bankLen: Record<string, number> = { SA: 2, AE: 3, EG: 4, KW: 4, QA: 4, BH: 4, OM: 3 };
  const bankCode = iban.slice(4, 4 + (bankLen[country] ?? 4));
  return { ok: true, iban, country, bankCode };
}

/** Builds a valid IBAN from country + BBAN by computing the check digits (used for the fictional sample data). */
export function makeIban(country: string, bban: string): string {
  const probe = country + '00' + bban;
  const check = 98 - ibanMod97(probe);
  return country + String(check).padStart(2, '0') + bban;
}
