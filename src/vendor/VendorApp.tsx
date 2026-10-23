import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { LensMark } from '@/components/LensMark';
import { DemoBanner } from '@/components/DemoBanner';
import { useStore } from '@/app/store';
import { LangContext, translate, type LangContextValue } from '@/lib/i18n';
import type { Lang, Vendor } from '@/lib/types';
import { Welcome } from './Welcome';
import { GuidedForm } from './Form';
import { Documents } from './Documents';
import { ReviewSubmit } from './ReviewSubmit';
import { StatusTracker } from './Status';
import { COUNTRIES } from '@/data/countries';
import { VendorPicker } from '@/components/VendorPicker';
import { ArrowLeft } from 'lucide-react';

function Rail({ vendor, t, go }: { vendor: Vendor; t: LangContextValue['t']; go: (stage: Vendor['stage'], formStep?: number) => void }) {
  const steps: { key: string; label: string; done: boolean; active: boolean; to: () => void }[] = [
    { key: 'company', label: t('form.steps.company'), done: vendor.formStep > 0 || vendor.stage !== 'form', active: vendor.stage === 'form' && vendor.formStep === 0, to: () => go('form', 0) },
    { key: 'tax', label: t('form.steps.tax'), done: vendor.formStep > 1 || vendor.stage !== 'form', active: vendor.stage === 'form' && vendor.formStep === 1, to: () => go('form', 1) },
    { key: 'bank', label: t('form.steps.bank'), done: vendor.formStep > 2 || vendor.stage !== 'form', active: vendor.stage === 'form' && vendor.formStep === 2, to: () => go('form', 2) },
    { key: 'contacts', label: t('form.steps.contacts'), done: vendor.stage !== 'form', active: vendor.stage === 'form' && vendor.formStep === 3, to: () => go('form', 3) },
    { key: 'documents', label: t('documents.eyebrow'), done: vendor.stage === 'review' || vendor.stage === 'status', active: vendor.stage === 'documents', to: () => go('documents') },
    { key: 'review', label: t('review.eyebrow'), done: vendor.stage === 'status', active: vendor.stage === 'review', to: () => go('review') },
  ];
  const c = COUNTRIES[vendor.country];
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-24">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{t('welcome.eyebrow')}</div>
        <div className="mt-1 text-sm font-medium text-ink">{vendor.company.legalName || vendor.email}</div>
        <div className="text-xs text-muted">{c.flag} {t('common.lang') === 'ar' ? c.nameAr : c.name}</div>
        <ol className="mt-6 space-y-1">
          {steps.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={s.to}
                disabled={!s.done && !s.active}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start text-sm transition ${s.active ? 'bg-white text-ink shadow-soft' : s.done ? 'text-body hover:bg-white/70' : 'text-muted'} disabled:cursor-default`}
                aria-current={s.active ? 'step' : undefined}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${s.done ? 'bg-teal text-white' : s.active ? 'border-2 border-teal text-teal' : 'border border-champagne text-muted'}`}>{s.done ? <Check size={11} /> : i + 1}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-8 border-s-2 border-champagne ps-3 text-[11px] leading-relaxed text-muted">{t('welcome.principle')}</p>
      </div>
    </aside>
  );
}

export function VendorApp() {
  const { inviteId = '' } = useParams();
  const store = useStore();
  const vendor = store.getByInvite(inviteId);
  const lang: Lang = vendor?.lang ?? 'en';

  const ctx = useMemo<LangContextValue>(
    () => ({
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      setLang: (l) => vendor && store.patch(vendor.id, { lang: l }),
      t: (k, v) => (k === 'common.lang' ? lang : translate(lang, k, v)),
    }),
    [lang, vendor, store],
  );

  if (!vendor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-greige p-8 text-center">
        <LensMark size={48} />
        <h1 className="mt-6 text-2xl">This invitation link is not recognised.</h1>
        <p className="mt-2 text-sm text-body">Ask procurement to send a new link, or <Link to="/" className="text-teal underline">go back to the start</Link>.</p>
      </div>
    );
  }

  const toggle = (l: Lang) => (
    <button onClick={() => ctx.setLang(l)} className={`rounded-lg px-2.5 py-1 text-sm ${lang === l ? 'bg-teal text-white' : 'text-body hover:bg-greige'}`} aria-pressed={lang === l} lang={l}>
      {l === 'en' ? 'EN' : 'ع'}
    </button>
  );
  const showRail = vendor.stage !== 'welcome' && vendor.stage !== 'status';

  return (
    <LangContext.Provider value={ctx}>
      <div dir={ctx.dir} lang={lang} className={`min-h-screen bg-greige ${lang === 'ar' ? 'font-arabic' : ''}`}>
        <header className="sticky top-0 z-40 border-b border-champagne/40 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
            <Link to="/"><Brand product={lang === 'ar' ? 'تسجيل المورّدين' : 'Vendor Onboarding'} /></Link>
            <div className="ms-auto flex items-center gap-2">
              <VendorPicker current={vendor} compact />
              <div className="flex items-center gap-1 rounded-xl border border-champagne/70 bg-white p-0.5" role="group" aria-label="Language" data-tour="lang-toggle">
              {toggle('en')}
              {toggle('ar')}
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto flex max-w-6xl gap-10 px-6 py-8 md:py-10">
          {showRail && <Rail vendor={vendor} t={ctx.t} go={(stage, formStep) => store.update(vendor.id, (v) => ({ ...v, stage, formStep: formStep ?? v.formStep }))} />}
          <div className="page-enter min-w-0 flex-1" key={vendor.stage + vendor.formStep}>
            {vendor.stage === 'welcome' && <Welcome vendor={vendor} />}
            {vendor.stage === 'form' && <GuidedForm vendor={vendor} />}
            {vendor.stage === 'documents' && <Documents vendor={vendor} />}
            {vendor.stage === 'review' && <ReviewSubmit vendor={vendor} />}
            {vendor.stage === 'status' && <StatusTracker vendor={vendor} />}
            {vendor.stage !== 'welcome' && vendor.stage !== 'status' && (
              <button className="mt-6 inline-flex items-center gap-1 text-xs text-muted hover:text-ink" onClick={() => store.update(vendor.id, (v) => ({ ...v, stage: 'welcome' }))}><ArrowLeft size={12} /> {ctx.t('common.back')}</button>
            )}
          </div>
        </main>
        <footer className="px-6 py-6 text-center text-xs text-muted">{ctx.t('brand.footer')}</footer>
        <DemoBanner />
      </div>
    </LangContext.Provider>
  );
}
