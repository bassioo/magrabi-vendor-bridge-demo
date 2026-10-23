import type { Country } from './types';
import { COUNTRIES } from '@/data/countries';

export const BANK_LETTER_MAX_MONTHS = 6;

export function monthsBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  return months;
}

export function bankLetterWithinPolicy(issuedIso: string, today = new Date().toISOString()): { ok: boolean; months: number } {
  const months = monthsBetween(issuedIso, today);
  return { ok: months <= BANK_LETTER_MAX_MONTHS, months };
}

export function registrationNotExpired(expiryIso: string, today = new Date().toISOString()): boolean {
  return new Date(expiryIso).getTime() >= new Date(today).getTime();
}

/** Tax number format per country profile (format only; the registry check is simulated separately). */
export function vatFormat(country: Country, value: string): { ok: boolean; message: string; messageAr: string; optional: boolean } {
  const t = COUNTRIES[country].tax;
  const v = (value || '').replace(/\s+/g, '');
  if (!t.applicable && !v) return { ok: true, optional: true, message: t.format, messageAr: t.formatAr };
  const ok = t.pattern.test(v);
  return ok
    ? { ok: true, optional: !t.applicable, message: `Format valid · ${t.format}`, messageAr: `الصيغة صحيحة · ${t.formatAr}` }
    : { ok: false, optional: !t.applicable, message: `Expected format: ${t.format}.`, messageAr: `الصيغة المتوقعة: ${t.formatAr}.` };
}

/** Normalises company names so Arabic/English and legal suffixes compare sensibly. */
export function normaliseName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '') // Arabic diacritics + tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\b(llc|l\.l\.c\.?|wll|w\.l\.l\.?|sal|s\.a\.l\.?|jsc|plc|ltd|limited|co\.?|company|est\.?|establishment|trading|for trading|شركة|مؤسسة|ذ\.?م\.?م\.?|ش\.?م\.?م\.?|المحدودة|للتجارة|التجارية)\b/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\band\b|&|و /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word stems so 'promotions' and 'promotional' compare equal. */
function stem(t: string): string {
  return t.length >= 6 ? t.slice(0, 6) : t;
}

/**
 * Name match for the duplicate check and the account-holder check.
 * Exact or containment after normalisation, or at least 75% of the shorter name's words (stemmed) found in the other,
 * with a minimum of two words. 'Manama Optical Fixtures' vs 'Riyadh Optical Fixtures' is NOT a match (2 of 3).
 */
export function namesMatch(a: string, b: string): boolean {
  const na = normaliseName(a).replace(/\s/g, '');
  const nb = normaliseName(b).replace(/\s/g, '');
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(normaliseName(a).split(' ').filter((t) => t.length > 2).map(stem));
  const tb = new Set(normaliseName(b).split(' ').filter((t) => t.length > 2).map(stem));
  if (ta.size === 0 || tb.size === 0) return false;
  let hits = 0;
  ta.forEach((t) => {
    if (tb.has(t)) hits += 1;
  });
  const smaller = Math.min(ta.size, tb.size);
  return hits >= 2 && hits / smaller >= 0.75;
}

export function countryIbanPrefix(country: Country): string {
  return COUNTRIES[country].ibanPrefix;
}
