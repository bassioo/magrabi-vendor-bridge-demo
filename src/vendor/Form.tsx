import { useEffect, useState } from 'react';
import { Loader2, Save, ShieldCheck, Wand2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { Vendor } from '@/lib/types';
import { useStore } from '@/app/store';
import { useLang, pick } from '@/lib/i18n';
import { COUNTRY_LABELS } from '@/data/checklists';
import { Headline } from '@/components/Headline';
import { ProgressBar } from '@/components/Stepper';
import { registryLookup } from '@/lib/mockRegistries';
import { sampleForVendor } from '@/lib/sampleCompanies';
import { validateIban, formatIban } from '@/lib/iban';
import { vatFormat, namesMatch, countryIbanPrefix } from '@/lib/rules';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function GuidedForm({ vendor }: { vendor: Vendor }) {
  const { t, lang } = useLang();
  const store = useStore();
  const step = vendor.formStep;
  const country = COUNTRY_LABELS[vendor.country];
  const sample = sampleForVendor(vendor);
  const [looking, setLooking] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<'found' | 'notFound' | null>(vendor.company.verifiedBy ? 'found' : null);
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState(false);
  const steps = [t('form.steps.company'), t('form.steps.tax'), t('form.steps.bank'), t('form.steps.contacts')];

  const set = (fn: (v: Vendor) => Vendor) => store.update(vendor.id, fn);
  const setCompany = (patch: Partial<Vendor['company']>) => set((v) => ({ ...v, company: { ...v.company, ...patch } }));

  useEffect(() => {
    setTouched(false);
  }, [step]);

  const lookup = async (regNumber: string) => {
    if (!regNumber.trim()) return;
    setLooking(true);
    setLookupMsg(null);
    const r = await registryLookup(vendor.country, regNumber);
    setLooking(false);
    if (r.found) {
      setLookupMsg('found');
      set((v) => ({
        ...v,
        name: r.legalName ?? v.name,
        company: { ...v.company, regNumber, legalName: r.legalName ?? '', legalNameAr: r.legalNameAr ?? '', regStatus: r.status ?? '', issueDate: r.issueDate ?? '', expiryDate: r.expiryDate ?? '', city: r.city ?? '', address: r.address ?? '', verifiedBy: r.registry },
      }));
      store.audit(vendor.id, 'System', 'registry', `${r.registry} (simulated): ${regNumber} found · ${r.legalName} · ${r.status} · expires ${r.expiryDate}`, `${r.latencyMs} ms`);
    } else {
      setLookupMsg('notFound');
      setCompany({ verifiedBy: undefined });
      store.audit(vendor.id, 'System', 'registry', `${r.registry} (simulated): ${regNumber} not found · vendor asked to enter details manually`, `${r.latencyMs} ms`);
    }
  };

  const fillSample = () => {
    if (step === 0) {
      setCompany({ regNumber: sample.company.regNumber });
      void lookup(sample.company.regNumber);
    } else if (step === 1) set((v) => ({ ...v, tax: { ...sample.tax } }));
    else if (step === 2) set((v) => ({ ...v, bank: { ...sample.bank } }));
    else set((v) => ({ ...v, contacts: { sales: { ...sample.contacts.sales }, ar: { ...sample.contacts.ar } } }));
  };

  const vat = vatFormat(vendor.country, vendor.tax.vatNumber);
  const iban = validateIban(vendor.bank.iban, countryIbanPrefix(vendor.country));
  const holderOk = !vendor.bank.accountHolder || !vendor.company.legalName || namesMatch(vendor.bank.accountHolder, vendor.company.legalName);

  const valid = [
    !!vendor.company.regNumber && !!vendor.company.legalName,
    vat.ok || vat.optional,
    iban.ok && !!vendor.bank.bankName && !!vendor.bank.accountHolder,
    !!vendor.contacts.sales.name && !!vendor.contacts.sales.email && !!vendor.contacts.ar.name && !!vendor.contacts.ar.email,
  ][step];

  const next = () => {
    setTouched(true);
    if (!valid) return;
    if (step === 2 && iban.ok) store.audit(vendor.id, 'System', 'rule', 'IBAN checksum valid (mod-97)', iban.iban);
    if (step < 3) set((v) => ({ ...v, formStep: step + 1 }));
    else {
      set((v) => ({ ...v, stage: 'documents', formStep: 3 }));
      store.audit(vendor.id, 'Vendor', 'system', 'Form saved · steps 1–4 complete');
    }
  };
  const back = () => (step > 0 ? set((v) => ({ ...v, formStep: step - 1 })) : set((v) => ({ ...v, stage: 'welcome' })));
  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const verifiedChip = vendor.company.verifiedBy && (
    <span className="chip bg-pass-bg text-pass">
      <ShieldCheck size={12} /> {t('form.company.found', { registry: country.registry, simulated: t('common.simulated') })}
    </span>
  );

  const titles = [
    [t('form.company.title'), t('form.company.titleAccent')],
    [t('form.tax.title'), t('form.tax.titleAccent')],
    [t('form.bank.title'), t('form.bank.titleAccent')],
    [t('form.contacts.title'), t('form.contacts.titleAccent')],
  ][step];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 flex items-center justify-between text-xs text-muted"><span>{steps[step]}</span><span>{Math.round(((step + 1) / 6) * 100)}%</span></div>
      <ProgressBar value={((step + 1) / 6) * 100} className="mb-8" />
      <Headline eyebrow={t('form.eyebrow', { n: step + 1 })} text={titles[0]} accent={titles[1]} size="md" />

      <div className="card mt-6 p-6 md:p-8" key={step}>
        {step === 0 && (
          <div className="space-y-5">
            <Field label={pick(lang, country.regLabel, country.regLabelAr)} hint={t('form.company.hint')}>
              <div className="flex gap-2">
                <input className="input" value={vendor.company.regNumber} onChange={(e) => setCompany({ regNumber: e.target.value, verifiedBy: undefined })} onBlur={(e) => vendor.company.verifiedBy ? undefined : lookup(e.target.value)} placeholder={sample.company.regNumber} dir="ltr" />
                <button className="btn-secondary shrink-0" onClick={() => lookup(vendor.company.regNumber)} disabled={looking || !vendor.company.regNumber}>
                  {looking ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} {country.registry}
                </button>
              </div>
              {looking && <div className="mt-2 text-xs text-muted">{t('form.company.lookup', { registry: country.registry })}</div>}
              {lookupMsg === 'notFound' && !looking && (
                <div className="mt-2 flex items-start gap-2 rounded-xl bg-flag-bg p-3 text-xs text-flag"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {t('form.company.notFound', { registry: country.registry })}</div>
              )}
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={t('form.company.legalName')}>
                <input className="input" value={vendor.company.legalName} onChange={(e) => setCompany({ legalName: e.target.value })} />
                {verifiedChip && <div className="mt-1.5">{verifiedChip}</div>}
              </Field>
              <Field label={t('form.company.legalNameAr')}>
                <input className="input" dir="rtl" value={vendor.company.legalNameAr} onChange={(e) => setCompany({ legalNameAr: e.target.value })} />
                {verifiedChip && <div className="mt-1.5">{verifiedChip}</div>}
              </Field>
              <Field label={t('form.company.status')}>
                <input className="input" value={vendor.company.regStatus} onChange={(e) => setCompany({ regStatus: e.target.value })} />
                {verifiedChip && <div className="mt-1.5">{verifiedChip}</div>}
              </Field>
              <Field label={t('form.company.city')}>
                <input className="input" value={vendor.company.city} onChange={(e) => setCompany({ city: e.target.value })} />
              </Field>
              <Field label={t('form.company.issueDate')}>
                <input className="input" type="date" value={vendor.company.issueDate} onChange={(e) => setCompany({ issueDate: e.target.value })} />
                {verifiedChip && <div className="mt-1.5">{verifiedChip}</div>}
              </Field>
              <Field label={t('form.company.expiryDate')}>
                <input className="input" type="date" value={vendor.company.expiryDate} onChange={(e) => setCompany({ expiryDate: e.target.value })} />
                {verifiedChip && <div className="mt-1.5">{verifiedChip}</div>}
              </Field>
            </div>
            <Field label={t('form.company.address')}>
              <input className="input" value={vendor.company.address} onChange={(e) => setCompany({ address: e.target.value })} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Field label={pick(lang, country.taxLabel, country.taxLabelAr)} hint={t('form.tax.hint')}>
              <input className="input" dir="ltr" value={vendor.tax.vatNumber} onChange={(e) => set((v) => ({ ...v, tax: { vatNumber: e.target.value } }))} placeholder={sample.tax.vatNumber} />
              {(vendor.tax.vatNumber || vat.optional) && (
                <div className={`mt-2 flex items-center gap-2 text-xs ${vat.ok ? (vendor.tax.vatNumber ? 'text-pass' : 'text-muted') : 'text-fail'}`}>
                  {vat.ok ? (vendor.tax.vatNumber ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />) : <XCircle size={14} />} {pick(lang, vat.message, vat.messageAr)}
                </div>
              )}
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <Field label={t('form.bank.iban')} hint={t('form.bank.ibanHint')}>
              <input className="input font-mono tracking-wide" dir="ltr" value={vendor.bank.iban} onChange={(e) => set((v) => ({ ...v, bank: { ...v.bank, iban: e.target.value.toUpperCase() } }))} onBlur={(e) => set((v) => ({ ...v, bank: { ...v.bank, iban: formatIban(e.target.value) } }))} placeholder={formatIban(sample.bank.iban)} />
              {vendor.bank.iban && (
                <div className={`mt-2 flex items-start gap-2 text-xs ${iban.ok ? 'text-pass' : 'text-fail'}`} role="status">
                  {iban.ok ? <CheckCircle2 size={14} className="shrink-0" /> : <XCircle size={14} className="shrink-0" />}
                  {iban.ok ? t('form.bank.ibanOk', { bank: pick(lang, `bank code ${iban.bankCode}`, `رمز البنك ${iban.bankCode}`) }) : pick(lang, iban.message, iban.messageAr)}
                </div>
              )}
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={t('form.bank.bankName')}>
                <input className="input" value={vendor.bank.bankName} onChange={(e) => set((v) => ({ ...v, bank: { ...v.bank, bankName: e.target.value } }))} />
              </Field>
              <Field label={t('form.bank.holder')} hint={t('form.bank.holderHint')}>
                <input className="input" value={vendor.bank.accountHolder} onChange={(e) => set((v) => ({ ...v, bank: { ...v.bank, accountHolder: e.target.value } }))} />
                {!holderOk && <div className="mt-2 flex items-center gap-2 text-xs text-flag"><AlertTriangle size={14} /> {pick(lang, 'This name differs from the legal name. A person will check it.', 'هذا الاسم يختلف عن الاسم القانوني. سيتحقق منه شخص مختص.')}</div>}
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-8 md:grid-cols-2">
            {(['sales', 'ar'] as const).map((key) => (
              <div key={key} className="space-y-4">
                <h3 className="text-lg">{t(`form.contacts.${key}`)}</h3>
                {(['name', 'email', 'phone'] as const).map((f) => (
                  <Field key={f} label={t(`form.contacts.${f}`)}>
                    <input className="input" dir={f === 'name' ? undefined : 'ltr'} type={f === 'email' ? 'email' : 'text'} value={vendor.contacts[key][f]} onChange={(e) => set((v) => ({ ...v, contacts: { ...v.contacts, [key]: { ...v.contacts[key], [f]: e.target.value } } }))} />
                  </Field>
                ))}
              </div>
            ))}
          </div>
        )}

        {touched && !valid && <div className="mt-4 text-xs text-fail">{pick(lang, 'Please complete the highlighted fields before continuing.', 'يرجى استكمال الحقول المطلوبة قبل المتابعة.')}</div>}

        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-greige pt-5">
          <button className="btn-ghost" onClick={back}>{t('common.back')}</button>
          <button className="btn-ghost text-xs text-muted" onClick={save}><Save size={14} /> {saved ? t('common.saved') : t('common.save')}</button>
          <button className="ms-auto rounded-full border border-dashed border-champagne px-3 py-1 text-[11px] text-muted hover:bg-cream" onClick={fillSample} title="Demo convenience: fills this step with the fictional sample vendor"><Wand2 size={12} className="mb-0.5 inline" /> {t('common.demoFill')}</button>
          <button className="btn-teal" onClick={next}>{step === 3 ? t('form.continue') : t('common.next')}</button>
        </div>
      </div>
    </div>
  );
}
