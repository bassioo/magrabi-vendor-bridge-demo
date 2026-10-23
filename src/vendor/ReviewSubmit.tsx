import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Vendor, FieldSource } from '@/lib/types';
import { useStore } from '@/app/store';
import { useLang, pick } from '@/lib/i18n';
import { CHECKLISTS, COUNTRY_LABELS } from '@/data/checklists';
import { Headline } from '@/components/Headline';
import { ProgressBar } from '@/components/Stepper';
import { SourceChip, LevelChip } from '@/components/StatusChip';
import { formatIban } from '@/lib/iban';
import { namesMatch } from '@/lib/rules';
import { runPostSubmitChecks } from '@/lib/postSubmit';

function Row({ label, value, source, lang }: { label: string; value: string; source: FieldSource; lang: 'en' | 'ar' }) {
  const text = source === 'official' ? pick(lang, 'Verified · official source', 'موثّق · مصدر رسمي') : source === 'ai' ? pick(lang, 'AI-extracted · consistent', 'مستخرج آليًا · متطابق') : pick(lang, 'Needs review', 'يحتاج مراجعة');
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div>
        <div className="text-[11px] text-muted">{label}</div>
        <div className="text-sm text-ink">{value || '—'}</div>
      </div>
      <SourceChip source={source} label={text} />
    </div>
  );
}

export function ReviewSubmit({ vendor, readOnly = false }: { vendor: Vendor; readOnly?: boolean }) {
  const { t, lang } = useLang();
  const store = useStore();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = COUNTRY_LABELS[vendor.country];
  const official: FieldSource = vendor.company.verifiedBy ? 'official' : 'ai';
  const holderOk = namesMatch(vendor.bank.accountHolder, vendor.company.legalName);
  const slots = CHECKLISTS[vendor.country];

  const submit = async () => {
    setBusy(true);
    const resubmit = vendor.status === 'returned' || vendor.returnCount > 0;
    store.update(vendor.id, (v) => ({ ...v, status: 'submitted', stage: 'status', submittedAt: new Date().toISOString(), name: v.company.legalName || v.name, firstTimeRight: v.firstTimeRight ?? true }));
    store.audit(vendor.id, 'Vendor', 'system', resubmit ? 'Registration resubmitted' : 'Registration submitted');
    store.email(vendor.id, 'submitted', 'MAGRABi · Registration received', `Thank you. We received the registration for ${vendor.company.legalName}. Procurement reviews most files within two working days. You can follow progress on the same link.`, `شكرًا لكم. استلمنا طلب تسجيل ${vendor.company.legalNameAr || vendor.company.legalName}. يراجع فريق المشتريات معظم الطلبات خلال يومي عمل. يمكنكم متابعة الحالة من الرابط نفسه.`);
    void runPostSubmitChecks(store, vendor.id);
  };

  return (
    <div className={`mx-auto max-w-3xl ${readOnly ? '[&_.btn-ghost]:hidden' : ''}`}>
      {!readOnly && <ProgressBar value={90} className="mb-8" />}
      <Headline eyebrow={t('review.eyebrow')} text={readOnly ? pick(lang, 'Your', 'طلبك') : t('review.title')} accent={readOnly ? pick(lang, 'submission.', 'كما أُرسل.') : t('review.titleAccent')} size="md" />
      {!readOnly && <p className="mt-3 text-sm text-body">{t('review.intro')}</p>}

      <div className="mt-6 space-y-4">
        <section className="card p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg">{t('review.company')}</h2><button className="btn-ghost text-xs" onClick={() => store.update(vendor.id, (v) => ({ ...v, stage: 'form', formStep: 0 }))}>{t('common.edit')}</button></div>
          <div className="divide-y divide-greige">
            <Row lang={lang} label={pick(lang, c.regLabel, c.regLabelAr)} value={vendor.company.regNumber} source={official} />
            <Row lang={lang} label={t('form.company.legalName')} value={vendor.company.legalName} source={official} />
            <Row lang={lang} label={t('form.company.legalNameAr')} value={vendor.company.legalNameAr} source={official} />
            <Row lang={lang} label={t('form.company.expiryDate')} value={vendor.company.expiryDate} source={official} />
          </div>
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg">{t('review.tax')}</h2><button className="btn-ghost text-xs" onClick={() => store.update(vendor.id, (v) => ({ ...v, stage: 'form', formStep: 1 }))}>{t('common.edit')}</button></div>
          <div className="divide-y divide-greige"><Row lang={lang} label={pick(lang, c.taxLabel, c.taxLabelAr)} value={vendor.tax.vatNumber} source="ai" /></div>
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg">{t('review.bank')}</h2><button className="btn-ghost text-xs" onClick={() => store.update(vendor.id, (v) => ({ ...v, stage: 'form', formStep: 2 }))}>{t('common.edit')}</button></div>
          <div className="divide-y divide-greige">
            <Row lang={lang} label="IBAN" value={formatIban(vendor.bank.iban)} source="ai" />
            <Row lang={lang} label={t('form.bank.bankName')} value={vendor.bank.bankName} source="ai" />
            <Row lang={lang} label={t('form.bank.holder')} value={vendor.bank.accountHolder} source={holderOk ? 'ai' : 'review'} />
          </div>
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg">{t('review.contacts')}</h2><button className="btn-ghost text-xs" onClick={() => store.update(vendor.id, (v) => ({ ...v, stage: 'form', formStep: 3 }))}>{t('common.edit')}</button></div>
          <div className="divide-y divide-greige">
            <Row lang={lang} label={t('form.contacts.sales')} value={`${vendor.contacts.sales.name} · ${vendor.contacts.sales.email}`} source="ai" />
            <Row lang={lang} label={t('form.contacts.ar')} value={`${vendor.contacts.ar.name} · ${vendor.contacts.ar.email}`} source="ai" />
          </div>
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg">{t('review.documents')}</h2><button className="btn-ghost text-xs" onClick={() => store.update(vendor.id, (v) => ({ ...v, stage: 'documents' }))}>{t('common.edit')}</button></div>
          <div className="divide-y divide-greige">
            {slots.map((s) => {
              const d = vendor.documents[s.id];
              return (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <div className="text-sm text-ink">{pick(lang, s.label, s.labelAr)}<span className="ms-2 text-xs text-muted">{d?.fileName}</span></div>
                  <LevelChip level={d?.level ?? 'pending'} label={d?.level === 'pass' ? t('common.pass') : d?.level === 'fail' ? t('common.fail') : t('common.flag')} />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {!readOnly && <div className="card mt-6 p-5">
        <label className="flex items-start gap-3 text-sm text-body">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#2C6E7C]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          {t('review.confirm')}
        </label>
        <div className="mt-4 flex gap-2">
          <button className="btn-ghost" onClick={() => store.update(vendor.id, (v) => ({ ...v, stage: 'documents' }))}>{t('common.back')}</button>
          <button className="btn-teal ms-auto px-6" disabled={!agree || busy} onClick={submit}>
            {busy && <Loader2 size={14} className="animate-spin" />} {busy ? t('review.submitting') : t('review.submit')}
          </button>
        </div>
      </div>}
    </div>
  );
}
