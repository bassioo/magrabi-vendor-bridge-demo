import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Download, ArrowUpDown } from 'lucide-react';
import { useStore } from '@/app/store';
import { InviteModal } from './InviteModal';
import { LevelChip } from '@/components/StatusChip';
import { reviewChecks, checkSummaryText, STATUS_LABEL, STATUS_LEVEL } from '@/lib/reviewChecks';
import { COUNTRY_LABELS } from '@/data/checklists';
import { COUNTRY_ORDER } from '@/data/countries';
import type { Country } from '@/lib/types';
import { fmtDate } from '@/lib/format';
import type { VendorStatus } from '@/lib/types';
import { OPEN_LINKS_IN_NEW_TAB } from '@/lib/routerMode';

const FILTERS: { key: string; label: string; statuses: VendorStatus[] }[] = [
  { key: 'queue', label: 'In queue', statuses: ['submitted', 'in_review'] },
  { key: 'returned', label: 'Returned', statuses: ['returned'] },
  { key: 'approved', label: 'Approved', statuses: ['approved', 'code_issued'] },
  { key: 'invited', label: 'Invited', statuses: ['invited', 'draft'] },
  { key: 'all', label: 'All', statuses: ['invited', 'draft', 'submitted', 'in_review', 'returned', 'approved', 'code_issued'] },
];

export function Queue() {
  const { vendors, state } = useStore();
  const [filter, setFilter] = useState('queue');
  const [invite, setInvite] = useState(false);
  const [country, setCountry] = useState<Country | 'all'>('all');
  const [sort, setSort] = useState<'date' | 'name' | 'country' | 'status'>('date');
  const navigate = useNavigate();
  const f = FILTERS.find((x) => x.key === filter)!;
  const rows = vendors
    .filter((v) => f.statuses.includes(v.status) && (country === 'all' || v.country === country))
    .sort((a, b) => sort === 'name' ? (a.name || a.email).localeCompare(b.name || b.email) : sort === 'country' ? a.country.localeCompare(b.country) : sort === 'status' ? a.status.localeCompare(b.status) : (b.submittedAt ?? b.invitedAt).localeCompare(a.submittedAt ?? a.invitedAt));
  const exportCsv = () => {
    const esc = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
    const body = ['Vendor,Email,Country,Category,Status,Submitted,Invited by,Assignee', ...rows.map((v) => [v.name, v.email, v.country, v.category, v.status, v.submittedAt ?? '', v.invitedBy, v.assignee ?? ''].map(esc).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vendor-queue-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const SortBtn = ({ k, label }: { k: typeof sort; label: string }) => (
    <button onClick={() => setSort(k)} className={`inline-flex items-center gap-1 ${sort === k ? 'text-ink' : ''}`}>{label} <ArrowUpDown size={11} className={sort === k ? 'text-gold-deep' : 'text-champagne'} /></button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Queue</div>
          <h1 className="text-4xl">Every vendor, <span className="accent">one place.</span></h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportCsv} title="Download the current list as CSV"><Download size={16} /> Export</button>
          <button className="btn-primary" onClick={() => setInvite(true)} data-tour="invite"><Plus size={16} /> Invite vendor</button>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((x) => {
          const n = vendors.filter((v) => x.statuses.includes(v.status)).length;
          return (
            <button key={x.key} onClick={() => setFilter(x.key)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${filter === x.key ? 'bg-gold text-white' : 'bg-white text-body hover:bg-cream'}`}>
              {x.label} <span className="opacity-70">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs" data-tour="market-filter">
        <span className="me-1 text-muted">Market:</span>
        <button onClick={() => setCountry('all')} className={`rounded-full px-2.5 py-1 ${country === 'all' ? 'bg-ink text-white' : 'bg-white text-body hover:bg-cream'}`}>All</button>
        {COUNTRY_ORDER.map((c) => (
          <button key={c} onClick={() => setCountry(c)} className={`rounded-full px-2.5 py-1 ${country === c ? 'bg-ink text-white' : 'bg-white text-body hover:bg-cream'}`}>{COUNTRY_LABELS[c].flag} {c}</button>
        ))}
      </div>
      <div className="card mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-greige/60 text-left text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold"><SortBtn k="name" label="Vendor" /></th>
              <th className="px-4 py-3 font-semibold"><SortBtn k="country" label="Country" /></th>
              <th className="px-4 py-3 font-semibold"><SortBtn k="date" label="Submitted" /></th>
              <th className="px-4 py-3 font-semibold"><SortBtn k="status" label="Status" /></th>
              <th className="px-4 py-3 font-semibold">Checks</th>
              <th className="px-4 py-3 font-semibold">Assignee</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const submitted = v.status !== 'invited' && v.status !== 'draft';
              const sum = submitted ? checkSummaryText(reviewChecks(v, state.sapVendors)) : null;
              return (
                <tr key={v.id} className={`border-t border-greige hover:bg-cream/40 ${submitted ? 'cursor-pointer' : ''}`} onClick={() => submitted && navigate(`/procurement/vendors/${v.id}`)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{v.name || <span className="text-muted">Awaiting submission</span>}</div>
                    <div className="text-xs text-muted">{v.email} · {v.category}</div>
                  </td>
                  <td className="px-4 py-3 text-body">{COUNTRY_LABELS[v.country].flag} {COUNTRY_LABELS[v.country].en}</td>
                  <td className="px-4 py-3 text-body">{v.submittedAt ? fmtDate(v.submittedAt) : <span className="text-muted">Invited {fmtDate(v.invitedAt)}</span>}</td>
                  <td className="px-4 py-3"><LevelChip level={STATUS_LEVEL[v.status]} label={STATUS_LABEL[v.status]} /></td>
                  <td className="px-4 py-3">{sum ? <LevelChip level={sum.level} label={sum.text} /> : <span className="text-xs text-muted">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-body">{v.assignee ? v.assignee.split(' ')[0] : <span className="text-muted">Unassigned</span>}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {submitted ? (
                      <Link to={`/procurement/vendors/${v.id}`} className="btn-secondary !py-1.5 text-xs">{v.status === 'submitted' || v.status === 'in_review' ? 'Review' : 'Open'} <ArrowRight size={14} /></Link>
                    ) : (
                      <Link to={`/vendor/${v.inviteId}`} target={OPEN_LINKS_IN_NEW_TAB ? '_blank' : undefined} className="btn-ghost !py-1.5 text-xs">Open link</Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">Nothing here yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {invite && <InviteModal onClose={() => setInvite(false)} />}
    </div>
  );
}
