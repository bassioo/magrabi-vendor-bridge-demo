import { describe, expect, it } from 'vitest';
import { makeIban, validateIban, ibanMod97 } from '../iban.js';
import { namesMatch, vatFormat, monthsBetween } from '../rules.js';
import { runDocChecks } from '../docChecks.js';
import { COUNTRIES, COUNTRY_ORDER } from '../countries.js';
import { findDuplicates } from '../duplicates.js';

describe('IBAN', () => {
  it('generates valid IBANs for every market and rejects a mistyped digit', () => {
    const bbans: Record<string, string> = { SA: '80000000123456789999', AE: '0330000098765432100', EG: '0037000300000000009876543', KW: 'GULF0000000000001234567890', QA: 'DOHA000000000000012345678', BH: 'MANA00000000123456', OM: '0120000000012345678' };
    for (const [cc, bban] of Object.entries(bbans)) {
      const iban = makeIban(cc, bban);
      expect(ibanMod97(iban)).toBe(1);
      expect(validateIban(iban, cc).ok).toBe(true);
      const bad = iban.slice(0, -1) + (iban.endsWith('9') ? '8' : '9');
      const r = validateIban(bad, cc);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(['checksum', 'format']).toContain(r.reason);
    }
  });
  it('rejects the wrong country prefix', () => {
    const r = validateIban(makeIban('SA', '80000000123456789999'), 'AE');
    expect(r.ok).toBe(false);
  });
});

describe('names', () => {
  it('matches the same company across spellings and languages', () => {
    expect(namesMatch('Nile Gifts & Promotions', 'Nile Gifts and Promotional Items')).toBe(true);
    expect(namesMatch('Bright Display Trading L.L.C', 'Bright Display Trading LLC')).toBe(true);
  });
  it('does not match different companies that share generic words', () => {
    expect(namesMatch('Manama Optical Fixtures W.L.L', 'Riyadh Optical Fixtures Co.')).toBe(false);
  });
});

describe('tax formats', () => {
  it('follows the country profile', () => {
    expect(vatFormat('KSA', '300567890123453').ok).toBe(true);
    expect(vatFormat('KSA', '100567890123453').ok).toBe(false);
    expect(vatFormat('UAE', '100765432100003').ok).toBe(true);
    expect(vatFormat('KW', '').optional).toBe(true);
    expect(vatFormat('OM', 'OM1100012345').ok).toBe(true);
  });
});

describe('document checks', () => {
  const bank = COUNTRIES.KSA.checklist.find((s) => s.id === 'bank-letter')!;
  it('fails a bank letter older than the policy and passes a recent one', () => {
    const old = new Date(); old.setMonth(old.getMonth() - 8);
    const recent = new Date(); recent.setDate(recent.getDate() - 10);
    const fail = runDocChecks(bank, { docType: 'bank-letter', legible: true, stamped: true, issuedDate: old.toISOString(), fields: {} }, 6);
    const pass = runDocChecks(bank, { docType: 'bank-letter', legible: true, stamped: true, issuedDate: recent.toISOString(), fields: {} }, 6);
    expect(fail.find((c) => c.id === 'date')?.level).toBe('fail');
    expect(pass.every((c) => c.level === 'pass')).toBe(true);
  });
  it('flags an unreadable date for a person instead of failing it', () => {
    const r = runDocChecks(bank, { docType: 'bank-letter', legible: true, stamped: true, fields: {} }, 6);
    expect(r.find((c) => c.id === 'date')?.level).toBe('flag');
  });
  it('fails a wrong document type and leaves the other checks pending', () => {
    const quote = COUNTRIES.KSA.checklist.find((s) => s.id === 'quotation')!;
    const r = runDocChecks(quote, { docType: 'invoice', legible: true, stamped: true, fields: {} }, 6);
    expect(r.find((c) => c.id === 'type')?.level).toBe('fail');
    expect(r.find((c) => c.id === 'legible')?.level).toBe('pending');
  });
  it('months between handles month ends', () => {
    expect(monthsBetween('2026-01-31', '2026-02-28')).toBe(0);
    expect(monthsBetween('2026-01-15', '2026-07-15')).toBe(6);
  });
});

describe('country profiles', () => {
  it('every market has a checklist, a bank letter slot and an IBAN prefix', () => {
    for (const c of COUNTRY_ORDER) {
      const p = COUNTRIES[c];
      expect(p.checklist.length).toBeGreaterThan(2);
      expect(p.checklist.some((s) => s.id === 'bank-letter')).toBe(true);
      expect(p.ibanPrefix).toHaveLength(2);
    }
  });
});

describe('duplicates', () => {
  it('ranks a tax-number match above a name-only match', () => {
    const sap = [
      { code: '1', name: 'Nile Gifts and Promotional Items', country: 'EG' as const, regNumber: '76543', vatNumber: '345-678-912', iban: '', createdAt: '', source: 'import' as const },
      { code: '2', name: 'Nile Gifts', country: 'EG' as const, regNumber: '1', vatNumber: '1', iban: '', createdAt: '', source: 'import' as const },
    ];
    const v = { name: 'Nile Gifts & Promotions', company: { regNumber: '76598', legalName: 'Nile Gifts & Promotions', legalNameAr: '', regStatus: '', issueDate: '', expiryDate: '', city: '', address: '' }, tax: { vatNumber: '345-678-912' }, bank: { iban: '', bankName: '', accountHolder: '' } };
    const m = findDuplicates(v, sap);
    expect(m[0].sap.code).toBe('1');
    expect(m[0].on).toContain('vat');
  });
});
