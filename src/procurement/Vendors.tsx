import { useState } from 'react';
import { useStore } from '@/app/store';
import { COUNTRIES } from '@/data/countries';
import { formatIban } from '@/lib/iban';
import { fmtDate } from '@/lib/format';
import { SimTag } from '@/components/StatusChip';

export function Vendors() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const rows = state.sapVendors.filter((v) => `${v.code} ${v.name} ${v.nameAr ?? ''} ${v.vatNumber}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Master data</div>
          <h1 className="text-4xl">SAP vendor list, <span className="accent">as the duplicate check sees it.</span></h1>
          <p className="mt-2 text-sm text-body">Every approved vendor lands here when the code is issued. New registrations are matched against this list on registration number, tax number, IBAN and normalised name. <SimTag text="simulated SAP" /></p>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by code, name or tax number" className="input max-w-xs" aria-label="Filter vendors" />
      </div>
      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-greige/60 text-left text-[11px] uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3 font-semibold">Code</th><th className="px-4 py-3 font-semibold">Vendor</th><th className="px-4 py-3 font-semibold">Country</th><th className="px-4 py-3 font-semibold">Registration</th><th className="px-4 py-3 font-semibold">Tax number</th><th className="px-4 py-3 font-semibold">IBAN</th><th className="px-4 py-3 font-semibold">Created</th></tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.code} className="border-t border-greige hover:bg-cream/40">
                <td className="px-4 py-2.5 font-mono text-[13px] text-ink">{v.code}</td>
                <td className="px-4 py-2.5"><div className="font-medium text-ink">{v.name}</div><div className="text-xs text-muted" dir="rtl">{v.nameAr}</div></td>
                <td className="px-4 py-2.5 text-body">{COUNTRIES[v.country].flag} {COUNTRIES[v.country].name}</td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-body">{v.regNumber}</td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-body">{v.vatNumber || '—'}</td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-body">{formatIban(v.iban)}</td>
                <td className="px-4 py-2.5 text-xs text-muted">{fmtDate(v.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
