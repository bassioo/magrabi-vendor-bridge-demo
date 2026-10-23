import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useStore } from '@/app/store';
import { COUNTRIES } from '@/data/countries';
import { STATUS_LABEL } from '@/lib/reviewChecks';
import type { Vendor } from '@/lib/types';

const ACTIVE: Vendor['status'][] = ['invited', 'draft', 'submitted', 'in_review', 'returned', 'approved', 'code_issued'];

/** Demo-only: jump between sample vendors on the vendor side. */
export function useDemoVendors(): Vendor[] {
  const { vendors } = useStore();
  return vendors
    .filter((v) => ACTIVE.includes(v.status) && !v.id.startsWith('v-hist'))
    .sort((a, b) => ACTIVE.indexOf(a.status) - ACTIVE.indexOf(b.status));
}

export function VendorPicker({ current, compact = false }: { current?: Vendor; compact?: boolean }) {
  const navigate = useNavigate();
  const list = useDemoVendors();
  return (
    <label className={`relative inline-flex items-center gap-2 rounded-xl border border-dashed border-champagne bg-white/80 ${compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} text-muted`} title="Demo: switch to another sample vendor">
      <span className="hidden sm:inline">Demo · vendor</span>
      <select
        value={current?.id ?? ''}
        onChange={(e) => {
          const v = list.find((x) => x.id === e.target.value);
          if (v) navigate(`/vendor/${v.inviteId}`);
        }}
        className="appearance-none bg-transparent pe-5 font-medium text-ink focus:outline-none"
        aria-label="Switch sample vendor"
      >
        {!current && <option value="">Choose…</option>}
        {list.map((v) => (
          <option key={v.id} value={v.id}>
            {COUNTRIES[v.country].flag} {v.name || v.email} · {STATUS_LABEL[v.status]}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute end-2 text-muted" />
    </label>
  );
}
