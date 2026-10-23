// Compatibility layer: everything now lives in countries.ts.
import type { Country } from '@/lib/types';
import { COUNTRIES, COUNTRY_ORDER } from './countries';
export type { ChecklistItem } from './countries';
export { CATEGORIES, CATEGORY_AR, categoryLabel } from './countries';

export const CHECKLISTS: Record<Country, import('./countries').ChecklistItem[]> = Object.fromEntries(COUNTRY_ORDER.map((c) => [c, COUNTRIES[c].checklist])) as Record<Country, import('./countries').ChecklistItem[]>;

export const COUNTRY_LABELS: Record<Country, { en: string; ar: string; flag: string; regLabel: string; regLabelAr: string; registry: string; taxLabel: string; taxLabelAr: string }> = Object.fromEntries(
  COUNTRY_ORDER.map((c) => {
    const p = COUNTRIES[c];
    return [c, { en: p.name, ar: p.nameAr, flag: p.flag, regLabel: p.regLabel, regLabelAr: p.regLabelAr, registry: p.registry, taxLabel: p.tax.label, taxLabelAr: p.tax.labelAr }];
  }),
) as never;
