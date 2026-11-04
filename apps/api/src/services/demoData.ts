// Fictional sample companies and SAP vendors used by demo mode and the seed. Every number is invented.
import { makeIban, type BankInfo, type CompanyInfo, type Contact, type Country, type SapVendor, type TaxInfo } from '@vendorhub/shared';

export interface SampleCompany {
  key: 'alnoor' | 'jeddah' | 'bright' | 'nile' | 'kw' | 'qa' | 'bh' | 'om';
  country: Country;
  category: string;
  email: string;
  company: CompanyInfo;
  tax: TaxInfo;
  bank: BankInfo;
  contacts: { sales: Contact; ar: Contact };
}

export const SAMPLE_COMPANIES: Record<SampleCompany['key'], SampleCompany> = {
  alnoor: { key: 'alnoor', country: 'KSA', category: 'Printing & signage', email: 'accounts@alnoor-print.example',
    company: { regNumber: '1010567890', legalName: 'Al Noor Print House Co.', legalNameAr: 'شركة دار النور للطباعة', regStatus: 'Active', issueDate: '2021-03-14', expiryDate: '2027-03-13', city: 'Riyadh', address: 'Al Olaya District, King Fahd Road, Riyadh 12211' },
    tax: { vatNumber: '300567890123453' }, bank: { iban: makeIban('SA', '80000000123456789999'), bankName: 'Riyadh National Bank (sample)', accountHolder: 'Al Noor Print House Co.' },
    contacts: { sales: { name: 'Faisal Al-Harbi', email: 'faisal@alnoor-print.example', phone: '+966 50 123 4567' }, ar: { name: 'Maha Al-Qahtani', email: 'accounts@alnoor-print.example', phone: '+966 11 234 5678' } } },
  jeddah: { key: 'jeddah', country: 'KSA', category: 'Store fixtures & displays', email: 'finance@jeddahfixtures.example',
    company: { regNumber: '4030998877', legalName: 'Jeddah Optical Fixtures Co.', legalNameAr: 'شركة جدة لتجهيزات البصريات', regStatus: 'Active', issueDate: '2019-09-02', expiryDate: '2027-09-01', city: 'Jeddah', address: 'Al Rawdah District, Prince Sultan Road, Jeddah 23435' },
    tax: { vatNumber: '300998877665543' }, bank: { iban: makeIban('SA', '10000000998877665544'), bankName: 'Jeddah Commercial Bank (sample)', accountHolder: 'Jeddah Optical Fixtures Co.' },
    contacts: { sales: { name: 'Rakan Al-Ghamdi', email: 'rakan@jeddahfixtures.example', phone: '+966 55 987 6543' }, ar: { name: 'Noura Al-Zahrani', email: 'finance@jeddahfixtures.example', phone: '+966 12 654 3210' } } },
  bright: { key: 'bright', country: 'UAE', category: 'Store fixtures & displays', email: 'finance@brightdisplay.example',
    company: { regNumber: 'CN-7654321', legalName: 'Bright Display Trading L.L.C', legalNameAr: 'برايت ديسبلاي للتجارة ذ.م.م', regStatus: 'Active', issueDate: '2024-01-10', expiryDate: '2027-01-09', city: 'Dubai', address: 'Al Quoz Industrial Area 3, Dubai' },
    tax: { vatNumber: '100765432100003' }, bank: { iban: makeIban('AE', '0330000098765432100'), bankName: 'Gulf Commercial Bank (sample)', accountHolder: 'Bright Display Trading L.L.C' },
    contacts: { sales: { name: 'Priya Nair', email: 'priya@brightdisplay.example', phone: '+971 50 765 4321' }, ar: { name: 'Omar Haddad', email: 'finance@brightdisplay.example', phone: '+971 4 321 7654' } } },
  nile: { key: 'nile', country: 'EG', category: 'Marketing & promotions', email: 'hello@nilegifts.example',
    company: { regNumber: '76598', legalName: 'Nile Gifts & Promotions', legalNameAr: 'النيل للهدايا والدعاية', regStatus: 'Active', issueDate: '2019-06-01', expiryDate: '2029-05-31', city: 'Cairo', address: '14 Nile Corniche, Maadi, Cairo' },
    tax: { vatNumber: '345-678-912' }, bank: { iban: makeIban('EG', '0037000300000000009876543'), bankName: 'Nile Commercial Bank (sample)', accountHolder: 'Nile Gifts & Promotions' },
    contacts: { sales: { name: 'Mona Fathy', email: 'mona@nilegifts.example', phone: '+20 100 123 4567' }, ar: { name: 'Karim Adel', email: 'hello@nilegifts.example', phone: '+20 2 2345 6789' } } },
  kw: { key: 'kw', country: 'KW', category: 'Store fixtures & displays', email: 'accounts@gulfshopfit.example',
    company: { regNumber: '2024-11234', legalName: 'Gulf Shopfit Co. W.L.L', legalNameAr: 'شركة الخليج لتجهيز المتاجر ذ.م.م', regStatus: 'Active', issueDate: '2024-02-05', expiryDate: '2027-02-04', city: 'Kuwait City', address: 'Shuwaikh Industrial Area, Block 2, Kuwait City' },
    tax: { vatNumber: '' }, bank: { iban: makeIban('KW', 'GULF0000000000001234567890'), bankName: 'Gulf National Bank (sample)', accountHolder: 'Gulf Shopfit Co. W.L.L' },
    contacts: { sales: { name: 'Yousef Al-Mutairi', email: 'yousef@gulfshopfit.example', phone: '+965 9912 3456' }, ar: { name: 'Dana Al-Sabah', email: 'accounts@gulfshopfit.example', phone: '+965 2222 3344' } } },
  qa: { key: 'qa', country: 'QA', category: 'Marketing & promotions', email: 'finance@dohapromo.example',
    company: { regNumber: '154321', legalName: 'Doha Promotions W.L.L', legalNameAr: 'الدوحة للدعاية ذ.م.م', regStatus: 'Active', issueDate: '2022-09-18', expiryDate: '2027-09-17', city: 'Doha', address: 'Salwa Road, Al Maamoura, Doha' },
    tax: { vatNumber: '' }, bank: { iban: makeIban('QA', 'DOHA000000000000012345678'), bankName: 'Doha Commercial Bank (sample)', accountHolder: 'Doha Promotions W.L.L' },
    contacts: { sales: { name: 'Hamad Al-Thani', email: 'hamad@dohapromo.example', phone: '+974 5512 3456' }, ar: { name: 'Lina Haddad', email: 'finance@dohapromo.example', phone: '+974 4433 2211' } } },
  bh: { key: 'bh', country: 'BH', category: 'Store fixtures & displays', email: 'accounts@manamafixtures.example',
    company: { regNumber: '98765-1', legalName: 'Manama Optical Fixtures W.L.L', legalNameAr: 'المنامة لتجهيزات البصريات ذ.م.م', regStatus: 'Active', issueDate: '2021-11-30', expiryDate: '2026-11-29', city: 'Manama', address: 'Sitra Industrial Area, Manama' },
    tax: { vatNumber: '200012345600002' }, bank: { iban: makeIban('BH', 'MANA00000000123456'), bankName: 'Manama Bank (sample)', accountHolder: 'Manama Optical Fixtures W.L.L' },
    contacts: { sales: { name: 'Ali Hassan', email: 'ali@manamafixtures.example', phone: '+973 3312 3456' }, ar: { name: 'Fatima Al-Khalifa', email: 'accounts@manamafixtures.example', phone: '+973 1722 3344' } } },
  om: { key: 'om', country: 'OM', category: 'Facilities & maintenance', email: 'accounts@muscatfm.example',
    company: { regNumber: '1234567', legalName: 'Muscat Facilities Management LLC', legalNameAr: 'مسقط لإدارة المرافق ش.م.م', regStatus: 'Active', issueDate: '2020-04-12', expiryDate: '2027-04-11', city: 'Muscat', address: 'Al Khuwair, Muscat' },
    tax: { vatNumber: 'OM1100012345' }, bank: { iban: makeIban('OM', '0120000000012345678'), bankName: 'Muscat National Bank (sample)', accountHolder: 'Muscat Facilities Management LLC' },
    contacts: { sales: { name: 'Said Al-Busaidi', email: 'said@muscatfm.example', phone: '+968 9123 4567' }, ar: { name: 'Noor Al-Harthy', email: 'accounts@muscatfm.example', phone: '+968 2447 8899' } } },
};

export function sampleForCountry(country: Country): SampleCompany {
  const byCountry: Record<Country, SampleCompany['key']> = { KSA: 'alnoor', UAE: 'bright', EG: 'nile', KW: 'kw', QA: 'qa', BH: 'bh', OM: 'om' };
  return SAMPLE_COMPANIES[byCountry[country]];
}
/** Sample company behind a vendor record (by email or registration number), else the market default. */
export function sampleForVendor(v: { country: Country; email: string; company?: { regNumber?: string } }): SampleCompany {
  const hit = Object.values(SAMPLE_COMPANIES).find((c) => c.email.toLowerCase() === v.email.toLowerCase() || (v.company?.regNumber && c.company.regNumber === v.company.regNumber));
  return hit ?? sampleForCountry(v.country);
}

export const SAP_VENDORS: SapVendor[] = [
  { code: '400101', name: 'Riyadh Optical Fixtures Co.', nameAr: 'شركة الرياض لتجهيزات البصريات', country: 'KSA', regNumber: '1010111222', vatNumber: '300011122233343', iban: makeIban('SA', '80000000608010167519'), createdAt: '2024-03-04', source: 'import' },
  { code: '400102', name: 'Jeddah Signage Works', nameAr: 'أعمال اللافتات جدة', country: 'KSA', regNumber: '4030222333', vatNumber: '300022233344453', iban: makeIban('SA', '10000000123456789012'), createdAt: '2024-04-11', source: 'import' },
  { code: '400103', name: 'Dammam Facilities Services Est.', nameAr: 'مؤسسة الدمام لخدمات المرافق', country: 'KSA', regNumber: '2050333444', vatNumber: '300033344455563', iban: makeIban('SA', '45000000987654321098'), createdAt: '2024-05-20', source: 'import' },
  { code: '400104', name: 'Najd Logistics Co.', nameAr: 'شركة نجد للخدمات اللوجستية', country: 'KSA', regNumber: '1010444555', vatNumber: '300044455566673', iban: makeIban('SA', '20000000555544443333'), createdAt: '2024-07-02', source: 'import' },
  { code: '400105', name: 'Hijaz IT Solutions', nameAr: 'حلول الحجاز لتقنية المعلومات', country: 'KSA', regNumber: '4030555666', vatNumber: '300055566677783', iban: makeIban('SA', '05000000111122223333'), createdAt: '2024-09-15', source: 'import' },
  { code: '400106', name: 'Gulf Display Systems LLC', nameAr: 'أنظمة الخليج للعرض ذ.م.م', country: 'UAE', regNumber: 'CN-1234567', vatNumber: '100123456700003', iban: makeIban('AE', '0330000012345678901'), createdAt: '2024-02-19', source: 'import' },
  { code: '400107', name: 'Marina Store Fit-Out LLC', nameAr: 'مارينا لتجهيز المتاجر ذ.م.م', country: 'UAE', regNumber: 'CN-2345678', vatNumber: '100234567800003', iban: makeIban('AE', '0260000098765432109'), createdAt: '2024-03-28', source: 'import' },
  { code: '400108', name: 'Emirates Cleaning Services', nameAr: 'الإمارات لخدمات التنظيف', country: 'UAE', regNumber: 'CN-3456789', vatNumber: '100345678900003', iban: makeIban('AE', '0460000011112222333'), createdAt: '2024-06-08', source: 'import' },
  { code: '400109', name: 'Desert Rose Promotions', nameAr: 'وردة الصحراء للدعاية', country: 'UAE', regNumber: 'CN-4567890', vatNumber: '100456789000003', iban: makeIban('AE', '0700000044445555666'), createdAt: '2024-08-30', source: 'import' },
  { code: '400110', name: 'Cairo Print & Pack', nameAr: 'القاهرة للطباعة والتغليف', country: 'EG', regNumber: '98765', vatNumber: '123-456-789', iban: makeIban('EG', '0019000100000000001234560'), createdAt: '2024-01-22', source: 'import' },
  { code: '400111', name: 'Giza Fixtures & Furniture', nameAr: 'الجيزة للتجهيزات والأثاث', country: 'EG', regNumber: '87654', vatNumber: '234-567-891', iban: makeIban('EG', '0003000200000000002345670'), createdAt: '2024-04-02', source: 'import' },
  // The duplicate for the demo: Nile Gifts' tax number already exists under a slightly different name
  { code: '400112', name: 'Nile Gifts and Promotional Items', nameAr: 'النيل للهدايا والمواد الدعائية', country: 'EG', regNumber: '76543', vatNumber: '345-678-912', iban: makeIban('EG', '0037000300000000003456780'), createdAt: '2023-11-14', source: 'import' },
  { code: '400113', name: 'Alexandria Logistics Co.', nameAr: 'شركة الإسكندرية للخدمات اللوجستية', country: 'EG', regNumber: '65432', vatNumber: '456-789-123', iban: makeIban('EG', '0010000400000000004567890'), createdAt: '2024-05-17', source: 'import' },
  { code: '400114', name: 'Delta Software House', nameAr: 'دلتا لبرمجيات الحاسب', country: 'EG', regNumber: '54321', vatNumber: '567-891-234', iban: makeIban('EG', '0026000500000000005678910'), createdAt: '2024-07-25', source: 'import' },
  { code: '400115', name: 'Red Sea Maintenance Services', nameAr: 'البحر الأحمر لخدمات الصيانة', country: 'EG', regNumber: '43210', vatNumber: '678-912-345', iban: makeIban('EG', '0019000600000000006789120'), createdAt: '2024-09-09', source: 'import' },
];
