import type { BankInfo, CompanyInfo, Contact, Country, TaxInfo } from './types';
import { makeIban } from './iban';

export interface SampleCompany {
  key: 'alnoor' | 'jeddah' | 'bright' | 'nile' | 'generic';
  country: Country;
  category: string;
  email: string;
  company: CompanyInfo;
  tax: TaxInfo;
  bank: BankInfo;
  contacts: { sales: Contact; ar: Contact };
}

// Three fictional vendors used throughout the demo. Every number is invented.
export const SAMPLE_COMPANIES: Record<'alnoor' | 'jeddah' | 'bright' | 'nile', SampleCompany> = {
  alnoor: {
    key: 'alnoor',
    country: 'KSA',
    category: 'Printing & signage',
    email: 'accounts@alnoor-print.example',
    company: {
      regNumber: '1010567890',
      legalName: 'Al Noor Print House Co.',
      legalNameAr: 'شركة دار النور للطباعة',
      regStatus: 'Active',
      issueDate: '2021-03-14',
      expiryDate: '2027-03-13',
      city: 'Riyadh',
      address: 'Al Olaya District, King Fahd Road, Riyadh 12211',
      verifiedBy: 'Wathq',
    },
    tax: { vatNumber: '300567890123453' },
    bank: { iban: makeIban('SA', '80000000123456789999'), bankName: 'Riyadh National Bank (sample)', accountHolder: 'Al Noor Print House Co.' },
    contacts: {
      sales: { name: 'Faisal Al-Harbi', email: 'faisal@alnoor-print.example', phone: '+966 50 123 4567' },
      ar: { name: 'Maha Al-Qahtani', email: 'accounts@alnoor-print.example', phone: '+966 11 234 5678' },
    },
  },
  // Second KSA supplier for a second live run in the showcase. Clean path, different numbers.
  jeddah: {
    key: 'jeddah',
    country: 'KSA',
    category: 'Store fixtures & displays',
    email: 'finance@jeddahfixtures.example',
    company: {
      regNumber: '4030998877',
      legalName: 'Jeddah Optical Fixtures Co.',
      legalNameAr: 'شركة جدة لتجهيزات البصريات',
      regStatus: 'Active',
      issueDate: '2019-09-02',
      expiryDate: '2027-09-01',
      city: 'Jeddah',
      address: 'Al Rawdah District, Prince Sultan Road, Jeddah 23435',
      verifiedBy: 'Wathq',
    },
    tax: { vatNumber: '300998877665543' },
    bank: { iban: makeIban('SA', '10000000998877665544'), bankName: 'Jeddah Commercial Bank (sample)', accountHolder: 'Jeddah Optical Fixtures Co.' },
    contacts: {
      sales: { name: 'Rakan Al-Ghamdi', email: 'rakan@jeddahfixtures.example', phone: '+966 55 987 6543' },
      ar: { name: 'Noura Al-Zahrani', email: 'finance@jeddahfixtures.example', phone: '+966 12 654 3210' },
    },
  },
  bright: {
    key: 'bright',
    country: 'UAE',
    category: 'Store fixtures & displays',
    email: 'finance@brightdisplay.example',
    company: {
      regNumber: 'CN-7654321',
      legalName: 'Bright Display Trading L.L.C',
      legalNameAr: 'برايت ديسبلاي للتجارة ذ.م.م',
      regStatus: 'Active',
      issueDate: '2024-01-10',
      expiryDate: '2027-01-09',
      city: 'Dubai',
      address: 'Al Quoz Industrial Area 3, Dubai',
      verifiedBy: 'DED',
    },
    tax: { vatNumber: '100765432100003' },
    bank: { iban: makeIban('AE', '0330000098765432100'), bankName: 'Gulf Commercial Bank (sample)', accountHolder: 'Bright Display Trading L.L.C' },
    contacts: {
      sales: { name: 'Priya Nair', email: 'priya@brightdisplay.example', phone: '+971 50 765 4321' },
      ar: { name: 'Omar Haddad', email: 'finance@brightdisplay.example', phone: '+971 4 321 7654' },
    },
  },
  nile: {
    key: 'nile',
    country: 'EG',
    category: 'Marketing & promotions',
    email: 'hello@nilegifts.example',
    company: {
      regNumber: '76598',
      legalName: 'Nile Gifts & Promotions',
      legalNameAr: 'النيل للهدايا والدعاية',
      regStatus: 'Active',
      issueDate: '2019-06-01',
      expiryDate: '2029-05-31',
      city: 'Cairo',
      address: '14 Nile Corniche, Maadi, Cairo',
      verifiedBy: 'GAFI',
    },
    // Tax registration already exists in SAP under "Nile Gifts and Promotional Items" (vendor 400112)
    tax: { vatNumber: '345-678-912' },
    bank: { iban: makeIban('EG', '0037000300000000009876543'), bankName: 'Nile Commercial Bank (sample)', accountHolder: 'Nile Gifts & Promotions' },
    contacts: {
      sales: { name: 'Mona Fathy', email: 'mona@nilegifts.example', phone: '+20 100 123 4567' },
      ar: { name: 'Karim Adel', email: 'hello@nilegifts.example', phone: '+20 2 2345 6789' },
    },
  },
};

// Fictional sample vendors for the other markets. Generic sample documents are used for these.
const GENERIC: Record<string, Omit<SampleCompany, 'key' | 'country'>> = {
  KW: {
    category: 'Store fixtures & displays', email: 'accounts@gulfshopfit.example',
    company: { regNumber: '2024-11234', legalName: 'Gulf Shopfit Co. W.L.L', legalNameAr: 'شركة الخليج لتجهيز المتاجر ذ.م.م', regStatus: 'Active', issueDate: '2024-02-05', expiryDate: '2027-02-04', city: 'Kuwait City', address: 'Shuwaikh Industrial Area, Block 2, Kuwait City', verifiedBy: 'MOCI' },
    tax: { vatNumber: '' },
    bank: { iban: makeIban('KW', 'GULF0000000000001234567890'), bankName: 'Gulf National Bank (sample)', accountHolder: 'Gulf Shopfit Co. W.L.L' },
    contacts: { sales: { name: 'Yousef Al-Mutairi', email: 'yousef@gulfshopfit.example', phone: '+965 9912 3456' }, ar: { name: 'Dana Al-Sabah', email: 'accounts@gulfshopfit.example', phone: '+965 2222 3344' } },
  },
  QA: {
    category: 'Marketing & promotions', email: 'finance@dohapromo.example',
    company: { regNumber: '154321', legalName: 'Doha Promotions W.L.L', legalNameAr: 'الدوحة للدعاية ذ.م.م', regStatus: 'Active', issueDate: '2022-09-18', expiryDate: '2027-09-17', city: 'Doha', address: 'Salwa Road, Al Maamoura, Doha', verifiedBy: 'MOCI' },
    tax: { vatNumber: '' },
    bank: { iban: makeIban('QA', 'DOHA000000000000012345678'), bankName: 'Doha Commercial Bank (sample)', accountHolder: 'Doha Promotions W.L.L' },
    contacts: { sales: { name: 'Hamad Al-Thani', email: 'hamad@dohapromo.example', phone: '+974 5512 3456' }, ar: { name: 'Lina Haddad', email: 'finance@dohapromo.example', phone: '+974 4433 2211' } },
  },
  BH: {
    category: 'Store fixtures & displays', email: 'accounts@manamafixtures.example',
    company: { regNumber: '98765-1', legalName: 'Manama Optical Fixtures W.L.L', legalNameAr: 'المنامة لتجهيزات البصريات ذ.م.م', regStatus: 'Active', issueDate: '2021-11-30', expiryDate: '2026-11-29', city: 'Manama', address: 'Sitra Industrial Area, Manama', verifiedBy: 'Sijilat' },
    tax: { vatNumber: '200012345600002' },
    bank: { iban: makeIban('BH', 'MANA00000000123456'), bankName: 'Manama Bank (sample)', accountHolder: 'Manama Optical Fixtures W.L.L' },
    contacts: { sales: { name: 'Ali Hassan', email: 'ali@manamafixtures.example', phone: '+973 3312 3456' }, ar: { name: 'Fatima Al-Khalifa', email: 'accounts@manamafixtures.example', phone: '+973 1722 3344' } },
  },
  OM: {
    category: 'Facilities & maintenance', email: 'accounts@muscatfm.example',
    company: { regNumber: '1234567', legalName: 'Muscat Facilities Management LLC', legalNameAr: 'مسقط لإدارة المرافق ش.م.م', regStatus: 'Active', issueDate: '2020-04-12', expiryDate: '2027-04-11', city: 'Muscat', address: 'Al Khuwair, Muscat', verifiedBy: 'MOCIIP' },
    tax: { vatNumber: 'OM1100012345' },
    bank: { iban: makeIban('OM', '0120000000012345678'), bankName: 'Muscat National Bank (sample)', accountHolder: 'Muscat Facilities Management LLC' },
    contacts: { sales: { name: 'Said Al-Busaidi', email: 'said@muscatfm.example', phone: '+968 9123 4567' }, ar: { name: 'Noor Al-Harthy', email: 'accounts@muscatfm.example', phone: '+968 2447 8899' } },
  },
};

/** Picks the sample company for a specific vendor record (by email or registration number), else the country default. */
export function sampleForVendor(v: { country: Country; email: string; company: { regNumber: string } }): SampleCompany {
  const hit = Object.values(SAMPLE_COMPANIES).find((c) => c.email.toLowerCase() === v.email.toLowerCase() || (v.company.regNumber && c.company.regNumber === v.company.regNumber));
  return hit ?? sampleForCountry(v.country);
}

export function sampleForCountry(country: Country): SampleCompany {
  if (country === 'KSA') return SAMPLE_COMPANIES.alnoor;
  if (country === 'UAE') return SAMPLE_COMPANIES.bright;
  if (country === 'EG') return SAMPLE_COMPANIES.nile;
  return { key: 'generic', country, ...GENERIC[country] };
}
