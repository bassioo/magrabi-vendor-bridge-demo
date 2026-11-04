import { createContext, useContext } from 'react';
import en from '@/data/en.json';
import ar from '@/data/ar.json';
import type { Lang } from '@vendorhub/shared';

type Dict = Record<string, unknown>;
const DICTS: Record<Lang, Dict> = { en: en as Dict, ar: ar as Dict };

function lookup(dict: Dict, key: string): string | undefined {
  let cur: unknown = dict;
  for (const p of key.split('.')) {
    if (cur && typeof cur === 'object' && p in (cur as Dict)) cur = (cur as Dict)[p];
    else return undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const raw = lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

export const LangContext = createContext<LangContextValue>({ lang: 'en', setLang: () => {}, t: (k, v) => translate('en', k, v), dir: 'ltr' });
export const useLang = () => useContext(LangContext);
export const pick = (lang: Lang, en: string, ar: string) => (lang === 'ar' ? ar : en);
