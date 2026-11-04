// SAP keying sheet: fields in SAP entry order. Codes are configurable placeholders until the SAP team confirms them.
import { COUNTRIES, normaliseIban, type Vendor } from '@vendorhub/shared';
import { toCsv } from '../lib/csv.js';

const BANK_KEY_LEN: Record<string, number> = { SA: 2, AE: 3, EG: 4, KW: 4, QA: 4, BH: 4, OM: 3 };

export function sapRows(v: Vendor): [string, string][] {
  const p = COUNTRIES[v.country];
  const iban = normaliseIban(v.bank.iban);
  return [
    ['Account group', 'ZVND'],
    ['Company code', p.companyCode],
    ['Purchasing organisation', '1000'],
    ['Name 1', v.company.legalName],
    ['Name 2 (Arabic)', v.company.legalNameAr],
    ['Search term', v.company.legalName.split(' ').slice(0, 2).join(' ').toUpperCase()],
    ['Street / house number', v.company.address],
    ['City', v.company.city],
    ['Country', p.ibanPrefix],
    ['Registration number', v.company.regNumber],
    ['Tax number 1', v.tax.vatNumber || 'n/a'],
    ['Currency', p.currency],
    ['Bank country', iban.slice(0, 2)],
    ['Bank key', iban.slice(4, 4 + (BANK_KEY_LEN[p.ibanPrefix] ?? 4))],
    ['IBAN', iban],
    ['Account holder', v.bank.accountHolder],
    ['Bank name', v.bank.bankName],
    ['Payment terms', 'Z060 (60 days net)'],
    ['Payment method', 'T (bank transfer)'],
    ['Reconciliation account', '210000'],
    ['AR contact', `${v.contacts.ar.name} · ${v.contacts.ar.email} · ${v.contacts.ar.phone}`],
    ['Approved by', `${v.approvedBy ?? ''} · ${v.approvedAt?.slice(0, 10) ?? ''}`],
  ];
}
export const sapCsv = (v: Vendor): string => toCsv(['Field', 'Value'], sapRows(v));
