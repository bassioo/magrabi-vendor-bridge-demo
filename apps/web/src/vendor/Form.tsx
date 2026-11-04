import { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useLang, pick } from '@/lib/i18n';
import { Headline } from '@/components/Headline';
import { ProgressBar } from '@/components/Stepper';
import { ErrorBox } from '@/components/ErrorBox';
import { useLookup, useValidate } from '@/api/hooks';
import { formatIban, validateIban, vatFormat, namesMatch, type Vendor } from '@vendorhub/shared';
import type { PortalCtx } from './VendorApp';

function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return <div><label className="label" htmlFor={htmlFor}>{label}</label>{children}{hint && <div className="mt-1 text-xs text-muted">{hint}</div>}</div>;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function GuidedForm({ ctx }: { ctx: PortalCtx }) {
  const { t, lang } = useLang();
  const { vendor: remote, profile } = ctx.portal;
  const step = remote.formStep;
  // Local draft, flushed to the API on blur / next (keeps typing snappy, autosave stays cheap)
  const [v, setV] = useState<Vendor>(remote);
  useEffect(() => setV(remote), [remote.id, remote.formStep, remote.stage]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useRef(false);
  const [touched, setTouched] = useState(false);
  const lookup = useLookup(ctx.token);
  const validate = useValidate(ctx.token);
  const [lookupState, setLookupState] = useState<'idle' | 'found' | 'notFound'>(remote.company.verifiedBy ? 'found' : 'idle');
  const steps = [t('form.steps.company'), t('form.steps.tax'), t('form.steps.bank'), t('form.steps.contacts')];

  const update = (fn: (x: Vendor) => Vendor) => { dirty.current = true; setV((x) => fn(x)); };
  const flush = async (extra: Record<string, unknown> = {}) => {
    const patch = { company: v.company, tax: v.tax, bank: v.bank, contacts: v.contacts, ...extra };
    dirty.current = false;
    await ctx.save(patch);
  };

  // Company lookup
  const doLookup = async (regNumber: string) => {
    if (!regNumber.trim()) return;
    const r = await lookup.mutateAsync(regNumber.trim()).catch(() => null);
    if (r?.found && r.company) {
      setLookupState('found');
      update((x) => ({ ...x, company: { ...x.company, regNumber: regNumber.trim(), ...r.company, verifiedBy: r.company?.verifiedBy ?? r.registry } }));
    } else {
      setLookupState('notFound');
      update((x) => ({ ...x, company: { ...x.company, regNumber: regNumber.trim(), verifiedBy: undefined } }));
    }
  };

  // IBAN server validation (debounced) + local checksum for instant feedback
  const ibanLocal = validateIban(v.bank.iban, profile.ibanPrefix);
  const debouncedIban = useDebounced(v.bank.iban, 500);
  const [ibanServer, setIbanServer] = useState<string | null>(null);
  useEffect(() => { if (debouncedIban && ibanLocal.ok) validate.mutateAsync({ iban: debouncedIban }).then((r) => setIbanServer(r.iban && !r.iban.ok ? pick(lang, r.iban.message, r.iban.messageAr) : null)).catch(() => null); else setIbanServer(null); }, [debouncedIban]); // eslint-disable-line react-hooks/exhaustive-deps

  const vat = vatFormat(v.country, v.tax.vatNumber);
  const holderOk = !v.bank.accountHolder || !v.company.legalName || namesMatch(v.bank.accountHolder, v.company.legalName);
  const valid = [!!v.company.regNumber && !!v.company.legalName, vat.ok || vat.optional, ibanLocal.ok && !ibanServer && !!v.bank.bankName && !!v.bank.accountHolder, !!v.contacts.sales.name && !!v.contacts.sales.email && !!v.contacts.ar.name && !!v.contacts.ar.email][step];

  const next = async () => { setTouched(true); if (!valid) return; if (step < 3) await flush({ formStep: step + 1 }); else await flush({ stage: 'documents', formStep: 3 }); };
  const back = async () => { if (step > 0) await flush({ formStep: step - 1 }); else await flush({ stage: 'welcome' }); };
  const verified = v.company.verifiedBy && <span className="chip bg-pass-bg text-pass"><ShieldCheck size={12} /> {t('form.company.found', { registry: v.company.verifiedBy, simulated: ctx.portal.mode === 'demo' ? t('common.simulated') : t('common.official') })}</span>;
  const titles = [[t('form.company.title'), t('form.company.titleAccent')], [t('form.tax.title'), t('form.tax.titleAccent')], [t('form.bank.title'), t('form.bank.titleAccent')], [t('form.contacts.title'), t('form.contacts.titleAccent')]][step];
  const setCompany = (p: Partial<Vendor['company']>) => update((x) => ({ ...x, company: { ...x.company, ...p } }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 flex items-center justify-between text-xs text-muted"><span>{steps[step]}</span><span>{Math.round(((step + 1) / 6) * 100)}%</span></div>
      <ProgressBar value={((step + 1) / 6) * 100} className="mb-8" />
      <Headline eyebrow={t('form.eyebrow', { n: step + 1 })} text={titles[0]} accent={titles[1]} size="md" />
      <div className="card mt-6 p-5 md:p-8" key={step} onBlur={() => { if (dirty.current) void flush(); }}>
        {step === 0 && (
          <div className="space-y-5">
            <Field label={pick(lang, profile.regLabel, profile.regLabelAr)} hint={t('form.company.hint')} htmlFor="reg">
              <div className="flex gap-2">
                <input id="reg" className="input" value={v.company.regNumber} onChange={(e) => { setCompany({ regNumber: e.target.value, verifiedBy: undefined }); setLookupState('idle'); }} onBlur={(e) => !v.company.verifiedBy && doLookup(e.target.value)} placeholder={profile.regExample} dir="ltr" inputMode="text" autoComplete="off" />
                <button type="button" className="btn-secondary shrink-0" onClick={() => doLookup(v.company.regNumber)} disabled={lookup.isPending || !v.company.regNumber}>{lookup.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} {profile.registry}</button>
              </div>
              {lookup.isPending && <div className="mt-2 text-xs text-muted">{t('form.company.lookup', { registry: profile.registry })}</div>}
              {lookupState === 'notFound' && !lookup.isPending && <div className="mt-2 flex items-start gap-2 rounded-xl bg-flag-bg p-3 text-xs text-flag"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {t('form.company.notFound', { registry: profile.registry })}</div>}
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={t('form.company.legalName')} htmlFor="ln"><input id="ln" className="input" value={v.company.legalName} onChange={(e) => setCompany({ legalName: e.target.value })} />{verified && <div className="mt-1.5">{verified}</div>}</Field>
              <Field label={t('form.company.legalNameAr')} htmlFor="lnar"><input id="lnar" className="input" dir="rtl" value={v.company.legalNameAr} onChange={(e) => setCompany({ legalNameAr: e.target.value })} />{verified && <div className="mt-1.5">{verified}</div>}</Field>
              <Field label={t('form.company.status')} htmlFor="st"><input id="st" className="input" value={v.company.regStatus} onChange={(e) => setCompany({ regStatus: e.target.value })} /></Field>
              <Field label={t('form.company.city')} htmlFor="city"><input id="city" className="input" value={v.company.city} onChange={(e) => setCompany({ city: e.target.value })} /></Field>
              <Field label={t('form.company.issueDate')} htmlFor="iss"><input id="iss" className="input" type="date" value={v.company.issueDate} onChange={(e) => setCompany({ issueDate: e.target.value })} /></Field>
              <Field label={t('form.company.expiryDate')} htmlFor="exp"><input id="exp" className="input" type="date" value={v.company.expiryDate} onChange={(e) => setCompany({ expiryDate: e.target.value })} />{verified && <div className="mt-1.5">{verified}</div>}</Field>
            </div>
            <Field label={t('form.company.address')} htmlFor="addr"><input id="addr" className="input" value={v.company.address} onChange={(e) => setCompany({ address: e.target.value })} /></Field>
          </div>
        )}
        {step === 1 && (
          <Field label={pick(lang, profile.tax.label, profile.tax.labelAr)} hint={t('form.tax.hint')} htmlFor="vat">
            <input id="vat" className="input" dir="ltr" value={v.tax.vatNumber} onChange={(e) => update((x) => ({ ...x, tax: { ...x.tax, vatNumber: e.target.value } }))} placeholder={profile.tax.example} inputMode="text" />
            {(v.tax.vatNumber || vat.optional) && <div className={`mt-2 flex items-center gap-2 text-xs ${vat.ok ? (v.tax.vatNumber ? 'text-pass' : 'text-muted') : 'text-fail'}`}>{vat.ok ? (v.tax.vatNumber ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />) : <XCircle size={14} />} {pick(lang, vat.message, vat.messageAr)}</div>}
          </Field>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <Field label={t('form.bank.iban')} hint={t('form.bank.ibanHint')} htmlFor="iban">
              <input id="iban" className="input font-mono tracking-wide" dir="ltr" value={v.bank.iban} onChange={(e) => update((x) => ({ ...x, bank: { ...x.bank, iban: e.target.value.toUpperCase() } }))} onBlur={(e) => update((x) => ({ ...x, bank: { ...x.bank, iban: formatIban(e.target.value) } }))} placeholder={`${profile.ibanPrefix}00 0000 …`} inputMode="text" autoComplete="off" />
              {v.bank.iban && <div className={`mt-2 flex items-start gap-2 text-xs ${ibanLocal.ok && !ibanServer ? 'text-pass' : 'text-fail'}`} role="status">{ibanLocal.ok && !ibanServer ? <CheckCircle2 size={14} className="shrink-0" /> : <XCircle size={14} className="shrink-0" />}{ibanLocal.ok ? ibanServer ?? t('form.bank.ibanOk', { bank: pick(lang, `bank code ${ibanLocal.bankCode}`, `رمز البنك ${ibanLocal.bankCode}`) }) : pick(lang, ibanLocal.message, ibanLocal.messageAr)}</div>}
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={t('form.bank.bankName')} htmlFor="bn"><input id="bn" className="input" value={v.bank.bankName} onChange={(e) => update((x) => ({ ...x, bank: { ...x.bank, bankName: e.target.value } }))} /></Field>
              <Field label={t('form.bank.holder')} hint={t('form.bank.holderHint')} htmlFor="ah"><input id="ah" className="input" value={v.bank.accountHolder} onChange={(e) => update((x) => ({ ...x, bank: { ...x.bank, accountHolder: e.target.value } }))} />{!holderOk && <div className="mt-2 flex items-center gap-2 text-xs text-flag"><AlertTriangle size={14} /> {t('form.bank.holderMismatch')}</div>}</Field>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-8 md:grid-cols-2">{(['sales', 'ar'] as const).map((key) => (
            <div key={key} className="space-y-4"><h3 className="text-lg">{t(`form.contacts.${key}`)}</h3>{(['name', 'email', 'phone'] as const).map((f) => (
              <Field key={f} label={t(`form.contacts.${f}`)} htmlFor={`${key}-${f}`}><input id={`${key}-${f}`} className="input" dir={f === 'name' ? undefined : 'ltr'} type={f === 'email' ? 'email' : f === 'phone' ? 'tel' : 'text'} value={v.contacts[key][f]} onChange={(e) => update((x) => ({ ...x, contacts: { ...x.contacts, [key]: { ...x.contacts[key], [f]: e.target.value } } }))} /></Field>
            ))}</div>
          ))}</div>
        )}
        {touched && !valid && <div className="mt-4 text-xs text-fail">{t('form.incomplete')}</div>}
        <ErrorBox error={lookup.error} className="mt-4" />
        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-greige pt-5">
          <button className="btn-ghost" onClick={back}>{t('common.back')}</button>
          <button className="btn-teal ms-auto" onClick={next}>{step === 3 ? t('form.continue') : t('common.next')}</button>
        </div>
      </div>
    </div>
  );
}
