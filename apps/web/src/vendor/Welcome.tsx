import { Clock, FileCheck2, Info, Upload, ScanSearch, UserCheck } from 'lucide-react';
import { useLang, pick } from '@/lib/i18n';
import { categoryLabel } from '@vendorhub/shared';
import { Headline } from '@/components/Headline';
import { LensMark } from '@/components/LensMark';
import type { PortalCtx } from './VendorApp';

export function Welcome({ ctx }: { ctx: PortalCtx }) {
  const { t, lang } = useLang();
  const { vendor, profile } = ctx.portal;
  const hasProgress = vendor.formStep > 0 || !!vendor.company.regNumber;
  const start = () => void ctx.save({ stage: 'form' });
  return (
    <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-start">
      <div>
        <div className="mb-6 flex items-center gap-3"><LensMark size={44} /><div><div className="text-[15px] font-semibold tracking-tight text-ink">MAGRABi</div><div className="eyebrow">{t('welcome.eyebrow')}</div></div></div>
        <Headline text={t('welcome.title')} accent={t('welcome.titleAccent')} />
        <p className="mt-5 text-base text-body">{t('welcome.invited', { company: pick(lang, 'MAGRABi', 'مغربي'), category: categoryLabel(vendor.category, lang) })}</p>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted"><Clock size={14} /> {t('welcome.time')}</p>
        <div className="mt-8"><button className="btn-teal px-6 py-3 text-base" onClick={start}>{hasProgress ? t('welcome.resume') : t('welcome.start')}</button></div>
        <ol className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
          {([[Upload, 'how1', 'how1b'], [ScanSearch, 'how2', 'how2b'], [UserCheck, 'how3', 'how3b']] as const).map(([Icon, h, p], i) => (
            <li key={i} className="rounded-xl border border-champagne/50 bg-white/70 p-3"><Icon size={16} className="text-teal" /><div className="mt-2 text-sm font-medium text-ink">{t(`welcome.${h}`)}</div><div className="text-xs text-muted">{t(`welcome.${p}`)}</div></li>
          ))}
        </ol>
        <p className="mt-8 max-w-md border-s-2 border-champagne ps-4 text-xs leading-relaxed text-muted">{t('welcome.principle')}</p>
      </div>
      <div className="card p-6">
        <div className="flex items-center gap-2"><FileCheck2 size={18} className="text-gold-deep" /><h2 className="text-xl">{t('welcome.needTitle')}</h2></div>
        <p className="mt-2 text-sm text-body">{t('welcome.needIntro', { country: pick(lang, profile.name, profile.nameAr) })}</p>
        <ul className="mt-4 space-y-3">{profile.checklist.map((item, i) => (
          <li key={item.id} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-[11px] font-semibold text-gold-deep">{i + 1}</span><div><div className="text-sm font-medium text-ink">{pick(lang, item.label, item.labelAr)}</div>{item.hint && <div className="text-xs text-muted">{pick(lang, item.hint, item.hintAr ?? '')}</div>}</div></li>
        ))}</ul>
        <div className="mt-5 flex gap-2 rounded-xl bg-cream p-3 text-xs text-gold-deep"><Info size={14} className="mt-0.5 shrink-0" /><span>{t('welcome.noInvoice')}</span></div>
      </div>
    </div>
  );
}
