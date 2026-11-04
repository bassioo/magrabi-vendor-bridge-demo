import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLang, pick } from '@/lib/i18n';
import { Headline } from '@/components/Headline';
import { ProgressBar } from '@/components/Stepper';
import { SourceChip, LevelChip } from '@/components/StatusChip';
import { ErrorBox } from '@/components/ErrorBox';
import { useSubmit } from '@/api/hooks';
import { formatIban, namesMatch, type FieldSource } from '@vendorhub/shared';
import type { PortalCtx } from './VendorApp';

function Row({ label, value, source, lang }: { label: string; value: string; source: FieldSource; lang: 'en' | 'ar' }) {
  const text = source === 'official' ? pick(lang, 'Verified · official source', 'موثّق · مصدر رسمي') : source === 'ai' ? pick(lang, 'Read from document', 'مقروء من المستند') : source === 'review' ? pick(lang, 'Needs review', 'يحتاج مراجعة') : pick(lang, 'Entered by you', 'أدخلته بنفسك');
  return <div className="flex flex-wrap items-center justify-between gap-2 py-2"><div><div className="text-[11px] text-muted">{label}</div><div className="text-sm text-ink">{value || '—'}</div></div><SourceChip source={source} label={text} /></div>;
}

export function ReviewSubmit({ ctx, readOnly = false }: { ctx: PortalCtx; readOnly?: boolean }) {
  const { t, lang } = useLang();
  const { vendor, profile } = ctx.portal;
  const submit = useSubmit(ctx.token);
  const [agree, setAgree] = useState(false);
  const official: FieldSource = vendor.company.verifiedBy ? 'official' : 'manual';
  const holderOk = namesMatch(vendor.bank.accountHolder, vendor.company.legalName);
  const docs = vendor.documents ?? [];
  const edit = (stage: 'form' | 'documents', formStep?: number) => !readOnly && <button className="btn-ghost text-xs" onClick={() => void ctx.save({ stage, formStep })}>{t('common.edit')}</button>;
  const Section = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => <section className="card p-5"><div className="flex items-center justify-between"><h2 className="text-lg">{title}</h2>{action}</div><div className="divide-y divide-greige">{children}</div></section>;
  return (
    <div className="mx-auto max-w-3xl">
      {!readOnly && <ProgressBar value={90} className="mb-8" />}
      <Headline eyebrow={t('review.eyebrow')} text={readOnly ? t('review.yourTitle') : t('review.title')} accent={readOnly ? t('review.yourTitleAccent') : t('review.titleAccent')} size="md" />
      {!readOnly && <p className="mt-3 text-sm text-body">{t('review.intro')}</p>}
      <div className="mt-6 space-y-4">
        <Section title={t('review.company')} action={edit('form', 0)}>
          <Row lang={lang} label={pick(lang, profile.regLabel, profile.regLabelAr)} value={vendor.company.regNumber} source={official} />
          <Row lang={lang} label={t('form.company.legalName')} value={vendor.company.legalName} source={official} />
          <Row lang={lang} label={t('form.company.legalNameAr')} value={vendor.company.legalNameAr} source={official} />
          <Row lang={lang} label={t('form.company.expiryDate')} value={vendor.company.expiryDate} source={official} />
        </Section>
        <Section title={t('review.tax')} action={edit('form', 1)}><Row lang={lang} label={pick(lang, profile.tax.label, profile.tax.labelAr)} value={vendor.tax.vatNumber || (profile.tax.applicable ? '' : pick(lang, 'Not applicable', 'لا ينطبق'))} source="manual" /></Section>
        <Section title={t('review.bank')} action={edit('form', 2)}>
          <Row lang={lang} label="IBAN" value={formatIban(vendor.bank.iban)} source="manual" />
          <Row lang={lang} label={t('form.bank.bankName')} value={vendor.bank.bankName} source="manual" />
          <Row lang={lang} label={t('form.bank.holder')} value={vendor.bank.accountHolder} source={holderOk ? 'manual' : 'review'} />
        </Section>
        <Section title={t('review.contacts')} action={edit('form', 3)}>
          <Row lang={lang} label={t('form.contacts.sales')} value={`${vendor.contacts.sales.name} · ${vendor.contacts.sales.email}`} source="manual" />
          <Row lang={lang} label={t('form.contacts.ar')} value={`${vendor.contacts.ar.name} · ${vendor.contacts.ar.email}`} source="manual" />
        </Section>
        <Section title={t('review.documents')} action={edit('documents')}>
          {profile.checklist.map((s) => { const d = docs.find((x) => x.slotId === s.id); return <div key={s.id} className="flex items-center justify-between py-2"><div className="text-sm text-ink">{pick(lang, s.label, s.labelAr)}<span className="ms-2 text-xs text-muted">{d?.fileName}</span></div><LevelChip level={d?.level ?? 'pending'} label={d?.level === 'pass' ? t('common.pass') : d?.level === 'fail' ? t('common.fail') : d ? t('common.flag') : t('common.pending')} /></div>; })}
        </Section>
      </div>
      {!readOnly && (
        <div className="card mt-6 p-5">
          <label className="flex items-start gap-3 text-sm text-body"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#2C6E7C]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />{t('review.confirm')}</label>
          <ErrorBox error={submit.error} className="mt-3" />
          <div className="mt-4 flex gap-2"><button className="btn-ghost" onClick={() => void ctx.save({ stage: 'documents' })}>{t('common.back')}</button><button className="btn-teal ms-auto px-6" disabled={!agree || submit.isPending} onClick={() => submit.mutate()}>{submit.isPending && <Loader2 size={14} className="animate-spin" />} {submit.isPending ? t('review.submitting') : t('review.submit')}</button></div>
        </div>
      )}
    </div>
  );
}
