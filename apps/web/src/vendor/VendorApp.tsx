import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ArrowLeft, Cloud, CloudOff } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { LensMark } from '@/components/LensMark';
import { Skeleton } from '@/components/Skeleton';
import { usePortal, useSavePortal, type VendorPortal } from '@/api/hooks';
import { LangContext, translate, type LangContextValue } from '@/lib/i18n';
import { ApiError } from '@/api/client';
import type { Lang, Vendor } from '@vendorhub/shared';
import { Welcome } from './Welcome';
import { GuidedForm } from './Form';
import { Documents } from './Documents';
import { ReviewSubmit } from './ReviewSubmit';
import { StatusTracker } from './Status';

export interface PortalCtx { portal: VendorPortal; token: string; save: (patch: Parameters<ReturnType<typeof useSavePortal>['mutate']>[0]) => Promise<unknown>; saving: 'idle' | 'saving' | 'saved' | 'error' }

function Rail({ vendor, t, go }: { vendor: Vendor; t: LangContextValue['t']; go: (stage: Vendor['stage'], formStep?: number) => void }) {
  const steps = [
    { key: 'company', label: t('form.steps.company'), done: vendor.formStep > 0 || vendor.stage !== 'form', active: vendor.stage === 'form' && vendor.formStep === 0, to: () => go('form', 0) },
    { key: 'tax', label: t('form.steps.tax'), done: vendor.formStep > 1 || vendor.stage !== 'form', active: vendor.stage === 'form' && vendor.formStep === 1, to: () => go('form', 1) },
    { key: 'bank', label: t('form.steps.bank'), done: vendor.formStep > 2 || vendor.stage !== 'form', active: vendor.stage === 'form' && vendor.formStep === 2, to: () => go('form', 2) },
    { key: 'contacts', label: t('form.steps.contacts'), done: vendor.stage !== 'form', active: vendor.stage === 'form' && vendor.formStep === 3, to: () => go('form', 3) },
    { key: 'documents', label: t('documents.eyebrow'), done: vendor.stage === 'review' || vendor.stage === 'status', active: vendor.stage === 'documents', to: () => go('documents') },
    { key: 'review', label: t('review.eyebrow'), done: vendor.stage === 'status', active: vendor.stage === 'review', to: () => go('review') },
  ];
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-24">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{t('welcome.eyebrow')}</div>
        <div className="mt-1 text-sm font-medium text-ink">{vendor.company.legalName || vendor.email}</div>
        <ol className="mt-6 space-y-1">{steps.map((s, i) => (
          <li key={s.key}><button type="button" onClick={s.to} disabled={!s.done && !s.active} className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start text-sm transition ${s.active ? 'bg-white text-ink shadow-soft' : s.done ? 'text-body hover:bg-white/70' : 'text-muted'} disabled:cursor-default`} aria-current={s.active ? 'step' : undefined}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${s.done ? 'bg-teal text-white' : s.active ? 'border-2 border-teal text-teal' : 'border border-champagne text-muted'}`}>{s.done ? <Check size={11} /> : i + 1}</span>{s.label}
          </button></li>
        ))}</ol>
        <p className="mt-8 border-s-2 border-champagne ps-3 text-[11px] leading-relaxed text-muted">{t('welcome.principle')}</p>
      </div>
    </aside>
  );
}

export function VendorApp() {
  const { token = '' } = useParams();
  const portal = usePortal(token);
  const save = useSavePortal(token);
  const [saving, setSaving] = useState<PortalCtx['saving']>('idle');
  const timer = useRef<number | null>(null);
  const vendor = portal.data?.vendor;
  const lang: Lang = vendor?.lang ?? 'en';

  const doSave: PortalCtx['save'] = async (patch) => {
    setSaving('saving');
    try {
      const r = await save.mutateAsync(patch);
      setSaving('saved');
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setSaving('idle'), 2000);
      return r;
    } catch (e) {
      setSaving('error');
      throw e;
    }
  };

  const ctx = useMemo<LangContextValue>(() => ({ lang, dir: lang === 'ar' ? 'rtl' : 'ltr', setLang: (l) => { void doSave({ lang: l }); }, t: (k, v) => translate(lang, k, v) }), [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = ctx.dir; return () => { document.documentElement.dir = 'ltr'; }; }, [lang, ctx.dir]);

  if (portal.isLoading) return <div className="mx-auto max-w-3xl p-8"><Skeleton className="h-8 w-1/2" /><Skeleton className="mt-6 h-64" /></div>;
  if (portal.error || !portal.data || !vendor) {
    const e = portal.error as ApiError | null;
    const expired = e?.status === 410;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-greige p-8 text-center">
        <LensMark size={48} />
        <h1 className="mt-6 text-2xl">{expired ? 'This invitation has expired.' : 'This invitation link is not recognised.'}</h1>
        <p className="mt-2 max-w-md text-sm text-body">{expired ? 'Invitations are valid for a limited time. Ask your MAGRABi contact to send a new one; everything you entered is kept.' : 'Check the link in your email, or ask your MAGRABi contact to send it again.'}</p>
        <div className="mt-2 text-sm text-body" dir="rtl">{expired ? 'انتهت صلاحية هذه الدعوة. يرجى طلب دعوة جديدة من جهة الاتصال في مغربي.' : 'رابط الدعوة غير معروف. يرجى التحقق من الرابط في بريدكم.'}</div>
        <Link to="/" className="btn-secondary mt-6">Home</Link>
      </div>
    );
  }

  const showRail = vendor.stage !== 'welcome' && vendor.stage !== 'status';
  const pctx: PortalCtx = { portal: portal.data, token, save: doSave, saving };
  const toggle = (l: Lang) => <button onClick={() => ctx.setLang(l)} className={`rounded-lg px-2.5 py-1 text-sm ${lang === l ? 'bg-teal text-white' : 'text-body hover:bg-greige'}`} aria-pressed={lang === l} lang={l}>{l === 'en' ? 'EN' : 'ع'}</button>;

  return (
    <LangContext.Provider value={ctx}>
      <div dir={ctx.dir} lang={lang} className={`min-h-screen bg-greige ${lang === 'ar' ? 'font-arabic' : ''}`}>
        <header className="sticky top-0 z-40 border-b border-champagne/40 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-6">
            <Brand product={lang === 'ar' ? 'تسجيل المورّدين' : 'Vendor onboarding'} />
            <div className="ms-auto flex items-center gap-2">
              <span className={`hidden items-center gap-1 text-[11px] sm:flex ${saving === 'error' ? 'text-fail' : 'text-muted'}`} aria-live="polite">
                {saving === 'saving' && <><Cloud size={12} /> {ctx.t('common.saving')}</>}{saving === 'saved' && <><Check size={12} /> {ctx.t('common.savedShort')}</>}{saving === 'error' && <><CloudOff size={12} /> {ctx.t('common.saveError')}</>}
              </span>
              <div className="flex items-center gap-1 rounded-xl border border-champagne/70 bg-white p-0.5" role="group" aria-label="Language">{toggle('en')}{toggle('ar')}</div>
            </div>
          </div>
        </header>
        <main className="mx-auto flex max-w-6xl gap-10 px-4 py-6 md:px-6 md:py-10">
          {showRail && <Rail vendor={vendor} t={ctx.t} go={(stage, formStep) => { void doSave({ stage, formStep: formStep ?? vendor.formStep }); }} />}
          <div className="page-enter min-w-0 flex-1" key={vendor.stage + vendor.formStep}>
            {vendor.stage === 'welcome' && <Welcome ctx={pctx} />}
            {vendor.stage === 'form' && <GuidedForm ctx={pctx} />}
            {vendor.stage === 'documents' && <Documents ctx={pctx} />}
            {vendor.stage === 'review' && <ReviewSubmit ctx={pctx} />}
            {vendor.stage === 'status' && <StatusTracker ctx={pctx} />}
            {showRail && <button className="mt-6 inline-flex items-center gap-1 text-xs text-muted hover:text-ink" onClick={() => void doSave({ stage: 'welcome' })}><ArrowLeft size={12} /> {ctx.t('common.back')}</button>}
          </div>
        </main>
        <footer className="px-6 py-6 text-center text-xs text-muted">{ctx.t('brand.footer')}</footer>
      </div>
    </LangContext.Provider>
  );
}
