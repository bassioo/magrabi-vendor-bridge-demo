import { useState } from 'react';
import { Info } from 'lucide-react';
import { COUNTRIES, COUNTRY_ORDER } from '@/data/countries';
import { IBAN_SPECS } from '@/lib/iban';
import type { Country } from '@/lib/types';

export function CountryRules() {
  const [active, setActive] = useState<Country>('KSA');
  const p = COUNTRIES[active];
  const iban = IBAN_SPECS[p.ibanPrefix];
  return (
    <div>
      <div className="eyebrow mb-2">Setup</div>
      <h1 className="text-4xl">Seven markets, <span className="accent">one flow, different paperwork.</span></h1>
      <p className="mt-2 max-w-2xl text-sm text-body">Each country has its own registry, tax regime, document list and IBAN format. These rules drive the vendor checklist, the instant checks and the review screen. They are a starting point for procurement to confirm, and they live in one file: <code className="rounded bg-white px-1 text-xs">src/data/countries.ts</code>.</p>

      <div className="mt-6 flex flex-wrap gap-2" data-tour="country-tabs">
        {COUNTRY_ORDER.map((c) => (
          <button key={c} onClick={() => setActive(c)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${active === c ? 'bg-gold text-white' : 'bg-white text-body hover:bg-cream'}`}>
            {COUNTRIES[c].flag} {COUNTRIES[c].name}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="card p-5">
          <div className="eyebrow">Identity</div>
          <dl className="mt-3 space-y-3 text-sm">
            <div><dt className="text-[11px] text-muted">Registry (simulated)</dt><dd className="text-ink">{p.registry}</dd></div>
            <div><dt className="text-[11px] text-muted">Registration number</dt><dd className="text-ink">{p.regLabel} <span className="font-mono text-xs text-muted">e.g. {p.regExample}</span></dd></div>
            <div><dt className="text-[11px] text-muted">Currency · SAP company code</dt><dd className="text-ink">{p.currency} · <span className="font-mono">{p.companyCode}</span></dd></div>
          </dl>
        </section>
        <section className="card p-5">
          <div className="eyebrow">Tax</div>
          <dl className="mt-3 space-y-3 text-sm">
            <div><dt className="text-[11px] text-muted">Regime</dt><dd className="text-ink">{p.tax.applicable ? `VAT · ${p.tax.authority}` : 'No VAT · tax number optional'}</dd></div>
            <div><dt className="text-[11px] text-muted">Field</dt><dd className="text-ink">{p.tax.label}</dd></div>
            <div><dt className="text-[11px] text-muted">Format rule</dt><dd className="text-ink">{p.tax.format}{p.tax.example && <span className="ms-2 font-mono text-xs text-muted">e.g. {p.tax.example}</span>}</dd></div>
          </dl>
        </section>
        <section className="card p-5">
          <div className="eyebrow">Bank</div>
          <dl className="mt-3 space-y-3 text-sm">
            <div><dt className="text-[11px] text-muted">IBAN</dt><dd className="text-ink">{iban?.label}</dd></div>
            <div><dt className="text-[11px] text-muted">Checksum</dt><dd className="text-ink">ISO 13616 mod-97, validated instantly on the vendor side</dd></div>
            <div><dt className="text-[11px] text-muted">Bank letter</dt><dd className="text-ink">Issued within the last {p.bankLetterMaxMonths} months, stamped by the bank</dd></div>
          </dl>
        </section>
      </div>

      <section className="card mt-5 p-5">
        <div className="flex items-center justify-between">
          <div className="eyebrow">Document checklist · {p.checklist.length} items</div>
          <span className="text-xs text-muted">Shown to the vendor on the welcome screen, one upload slot each</span>
        </div>
        <ol className="mt-3 grid gap-3 md:grid-cols-2">
          {p.checklist.map((item, i) => (
            <li key={item.id} className="flex gap-3 rounded-xl border border-champagne/50 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-[11px] font-semibold text-gold-deep">{i + 1}</span>
              <div>
                <div className="text-sm font-medium text-ink">{item.label} <span className="ms-1 text-xs text-muted" dir="rtl">{item.labelAr}</span></div>
                {item.hint && <div className="text-xs text-muted">{item.hint}</div>}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex gap-2 rounded-xl bg-cream p-3 text-xs text-gold-deep"><Info size={14} className="mt-0.5 shrink-0" /> {p.notes} These rules need confirmation by procurement before go-live.</div>
      </section>
    </div>
  );
}
