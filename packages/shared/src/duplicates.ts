import type { SapVendor, Vendor } from './types.js';
import { normaliseIban } from './iban.js';
import { namesMatch } from './rules.js';

export type MatchField = 'registration' | 'vat' | 'iban' | 'name';
export interface DuplicateMatch { sap: SapVendor; on: MatchField[] }

const clean = (s: string) => (s || '').replace(/[\s-]/g, '').toUpperCase();

/** Matches a candidate against the SAP vendor list on registration number, tax number, IBAN and normalised name. */
export function findDuplicates(vendor: Pick<Vendor, 'company' | 'tax' | 'bank' | 'name'>, sapVendors: SapVendor[]): DuplicateMatch[] {
  const out: DuplicateMatch[] = [];
  for (const sap of sapVendors) {
    const on: MatchField[] = [];
    if (vendor.company.regNumber && clean(sap.regNumber) === clean(vendor.company.regNumber)) on.push('registration');
    if (vendor.tax.vatNumber && sap.vatNumber && clean(sap.vatNumber) === clean(vendor.tax.vatNumber)) on.push('vat');
    if (vendor.bank.iban && normaliseIban(sap.iban) === normaliseIban(vendor.bank.iban)) on.push('iban');
    const name = vendor.company.legalName || vendor.name;
    if (name && (namesMatch(name, sap.name) || (sap.nameAr && vendor.company.legalNameAr && namesMatch(vendor.company.legalNameAr, sap.nameAr)))) on.push('name');
    if (on.length) out.push({ sap, on });
  }
  // strongest first: a hard identifier match outranks a name-only match
  return out.sort((a, b) => Number(b.on.some((m) => m !== 'name')) - Number(a.on.some((m) => m !== 'name')));
}

export const MATCH_LABELS: Record<MatchField, string> = { registration: 'registration number', vat: 'tax registration', iban: 'IBAN', name: 'normalised name' };
