import { Clock, FileCheck2, Info, Upload, ScanSearch, UserCheck } from 'lucide-react';
import type { Vendor } from '@/lib/types';
import { useStore } from '@/app/store';
import { useLang, pick } from '@/lib/i18n';
import { CHECKLISTS, COUNTRY_LABELS, categoryLabel } from '@/data/checklists';
import { Headline } from '@/components/Headline';
import { LensMark } from '@/components/LensMark';

export function Welcome({ vendor }: { vendor: Vendor }) {
  const { t, lang } = useLang();
  const store = useStore();
  const country = COUNTRY_LABELS[vendor.country];
  const hasProgress = vendor.formStep > 0 || !!vendor.company.regNumber;
  const start = () => {
    store.update(vendor.id, (v) => ({ ...v, stage: 'form', status: v.status === 'invited' ? 'draft' : v.status }));
    if (!hasProgress) store.audit(vendor.id, 'Vendor', 'system', `Opened invitation (${lang === 'ar' ? 'Arabic' : 'English'})`);
  };
  return (
    <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-start">
      <div>
        <div className="mb-6 flex items-center gap-3">
          <LensMark size={44} />
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-ink">MAGRABi</div>
            <div className="eyebrow">{t('welcome.eyebrow')}</div>
          </div>
        </div>
        <Headline text={t('welcome.title')} accent={t('welcome.titleAccent')} />
        <p className="mt-5 text-base text-body">{t('welcome.invited', { company: pick(lang, 'MAGRABi', 'مغربي'), category: categoryLabel(vendor.category, lang) })}</p>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Clock size={14} /> {t('welcome.time')}
        </p>
        <div className="mt-8 flex gap-3">
          <button className="btn-teal px-6 py-3 text-base" onClick={start} data-tour="start">
            {hasProgress ? t('welcome.resume') : t('welcome.start')}
          </button>
        </div>
        <ol className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
          {[
            [Upload, t('welcome.how1'), t('welcome.how1b')],
            [ScanSearch, t('welcome.how2'), t('welcome.how2b')],
            [UserCheck, t('welcome.how3'), t('welcome.how3b')],
          ].map(([Icon, h, p], i) => {
            const I = Icon as typeof Upload;
            return (
              <li key={i} className="rounded-xl border border-champagne/50 bg-white/70 p-3">
                <I size={16} className="text-teal" />
                <div className="mt-2 text-sm font-medium text-ink">{String(h)}</div>
                <div className="text-xs text-muted">{String(p)}</div>
              </li>
            );
          })}
        </ol>
        <p className="mt-8 max-w-md border-s-2 border-champagne ps-4 text-xs leading-relaxed text-muted">{t('welcome.principle')}</p>
      </div>
      <div className="card p-6" data-tour="checklist">
        <div className="flex items-center gap-2">
          <FileCheck2 size={18} className="text-gold-deep" />
          <h2 className="text-xl">{t('welcome.needTitle')}</h2>
        </div>
        <p className="mt-2 text-sm text-body">{t('welcome.needIntro', { country: pick(lang, country.en, country.ar) })}</p>
        <ul className="mt-4 space-y-3">
          {CHECKLISTS[vendor.country].map((item, i) => (
            <li key={item.id} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-[11px] font-semibold text-gold-deep">{i + 1}</span>
              <div>
                <div className="text-sm font-medium text-ink">{pick(lang, item.label, item.labelAr)}</div>
                {item.hint && <div className="text-xs text-muted">{pick(lang, item.hint, item.hintAr ?? '')}</div>}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex gap-2 rounded-xl bg-cream p-3 text-xs text-gold-deep">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>{t('welcome.noInvoice')}</span>
        </div>
      </div>
    </div>
  );
}
