import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSapVendors } from '@/api/hooks';
import { TableSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { formatIban, COUNTRIES } from '@vendorhub/shared';
import { fmtDate } from '@/lib/format';

export function SapVendors() {
  const [q, setQ] = useState('');
  const { data, isLoading } = useSapVendors(q);
  const rows = data?.rows ?? [];
  return (
    <div className="page-enter">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="eyebrow mb-2">Master data</div><h1 className="text-4xl">SAP vendor list, <span className="accent">as the duplicate check sees it.</span></h1><p className="mt-2 text-sm text-body">Every approved vendor lands here when the code is issued. New registrations are matched against this list. <Link to="/app/settings/sap" className="text-gold-deep underline">Import from SAP</Link></p></div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by code, name or tax number" className="input max-w-xs" aria-label="Filter vendors" />
      </div>
      {isLoading ? <div className="mt-6"><TableSkeleton /></div> : rows.length === 0 ? <div className="card mt-6"><EmptyState title="No vendors yet" text="Import the SAP vendor list in Settings so the duplicate check has something to match against." /></div> : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-greige/60 text-left text-[11px] uppercase tracking-wide text-muted"><tr><th className="px-4 py-3 font-semibold">Code</th><th className="px-4 py-3 font-semibold">Vendor</th><th className="px-4 py-3 font-semibold">Country</th><th className="px-4 py-3 font-semibold">Registration</th><th className="px-4 py-3 font-semibold">Tax number</th><th className="px-4 py-3 font-semibold">IBAN</th><th className="px-4 py-3 font-semibold">Created</th></tr></thead>
            <tbody>{rows.map((v) => (
              <tr key={v.code} className="border-t border-greige hover:bg-cream/40">
                <td className="px-4 py-2.5 font-mono text-[13px] text-ink">{v.code}</td>
                <td className="px-4 py-2.5"><div className="font-medium text-ink">{v.name}</div><div className="text-xs text-muted" dir="rtl">{v.nameAr}</div></td>
                <td className="px-4 py-2.5 text-body">{COUNTRIES[v.country]?.flag} {COUNTRIES[v.country]?.name ?? v.country}</td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-body">{v.regNumber || '—'}</td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-body">{v.vatNumber || '—'}</td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-body">{v.iban ? formatIban(v.iban) : '—'}</td>
                <td className="px-4 py-2.5 text-xs text-muted">{fmtDate(v.createdAt)}{v.source === 'issued' && <span className="ms-1 chip bg-pass-bg text-pass">issued here</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
