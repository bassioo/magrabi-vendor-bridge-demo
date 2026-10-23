import type { SapVendor } from '@/lib/types';
import { makeIban } from '@/lib/iban';

// 15 fictional existing SAP vendors. All numbers are invented and pass only our own format rules.
export const SAP_VENDORS: SapVendor[] = [
  { code: '400101', name: 'Riyadh Optical Fixtures Co.', nameAr: 'شركة الرياض لتجهيزات البصريات', country: 'KSA', regNumber: '1010111222', vatNumber: '300011122233343', iban: makeIban('SA', '80000000608010167519'), createdAt: '2024-03-04' },
  { code: '400102', name: 'Jeddah Signage Works', nameAr: 'أعمال اللافتات جدة', country: 'KSA', regNumber: '4030222333', vatNumber: '300022233344453', iban: makeIban('SA', '10000000123456789012'), createdAt: '2024-04-11' },
  { code: '400103', name: 'Dammam Facilities Services Est.', nameAr: 'مؤسسة الدمام لخدمات المرافق', country: 'KSA', regNumber: '2050333444', vatNumber: '300033344455563', iban: makeIban('SA', '45000000987654321098'), createdAt: '2024-05-20' },
  { code: '400104', name: 'Najd Logistics Co.', nameAr: 'شركة نجد للخدمات اللوجستية', country: 'KSA', regNumber: '1010444555', vatNumber: '300044455566673', iban: makeIban('SA', '20000000555544443333'), createdAt: '2024-07-02' },
  { code: '400105', name: 'Hijaz IT Solutions', nameAr: 'حلول الحجاز لتقنية المعلومات', country: 'KSA', regNumber: '4030555666', vatNumber: '300055566677783', iban: makeIban('SA', '05000000111122223333'), createdAt: '2024-09-15' },
  { code: '400106', name: 'Gulf Display Systems LLC', nameAr: 'أنظمة الخليج للعرض ذ.م.م', country: 'UAE', regNumber: 'CN-1234567', vatNumber: '100123456700003', iban: makeIban('AE', '0330000012345678901'), createdAt: '2024-02-19' },
  { code: '400107', name: 'Marina Store Fit-Out LLC', nameAr: 'مارينا لتجهيز المتاجر ذ.م.م', country: 'UAE', regNumber: 'CN-2345678', vatNumber: '100234567800003', iban: makeIban('AE', '0260000098765432109'), createdAt: '2024-03-28' },
  { code: '400108', name: 'Emirates Cleaning Services', nameAr: 'الإمارات لخدمات التنظيف', country: 'UAE', regNumber: 'CN-3456789', vatNumber: '100345678900003', iban: makeIban('AE', '0460000011112222333'), createdAt: '2024-06-08' },
  { code: '400109', name: 'Desert Rose Promotions', nameAr: 'وردة الصحراء للدعاية', country: 'UAE', regNumber: 'CN-4567890', vatNumber: '100456789000003', iban: makeIban('AE', '0700000044445555666'), createdAt: '2024-08-30' },
  { code: '400110', name: 'Cairo Print & Pack', nameAr: 'القاهرة للطباعة والتغليف', country: 'EG', regNumber: '98765', vatNumber: '123-456-789', iban: makeIban('EG', '0019000100000000001234560'), createdAt: '2024-01-22' },
  { code: '400111', name: 'Giza Fixtures & Furniture', nameAr: 'الجيزة للتجهيزات والأثاث', country: 'EG', regNumber: '87654', vatNumber: '234-567-891', iban: makeIban('EG', '0003000200000000002345670'), createdAt: '2024-04-02' },
  // The duplicate for the demo: Nile Gifts' tax number already exists under a slightly different name
  { code: '400112', name: 'Nile Gifts and Promotional Items', nameAr: 'النيل للهدايا والمواد الدعائية', country: 'EG', regNumber: '76543', vatNumber: '345-678-912', iban: makeIban('EG', '0037000300000000003456780'), createdAt: '2023-11-14' },
  { code: '400113', name: 'Alexandria Logistics Co.', nameAr: 'شركة الإسكندرية للخدمات اللوجستية', country: 'EG', regNumber: '65432', vatNumber: '456-789-123', iban: makeIban('EG', '0010000400000000004567890'), createdAt: '2024-05-17' },
  { code: '400114', name: 'Delta Software House', nameAr: 'دلتا لبرمجيات الحاسب', country: 'EG', regNumber: '54321', vatNumber: '567-891-234', iban: makeIban('EG', '0026000500000000005678910'), createdAt: '2024-07-25' },
  { code: '400115', name: 'Red Sea Maintenance Services', nameAr: 'البحر الأحمر لخدمات الصيانة', country: 'EG', regNumber: '43210', vatNumber: '678-912-345', iban: makeIban('EG', '0019000600000000006789120'), createdAt: '2024-09-09' },
];
