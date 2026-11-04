import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Plus, ArrowRight, Download, ArrowUpDown } from 'lucide-react';
import { exportQueue, useVendors, type Me } from '@/api/hooks';
import { InviteModal } from './InviteModal';
import { LevelChip } from '@/components/StatusChip';
import { TableSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBox } from '@/components/ErrorBox';
import { useToast } from '@/components/Toast';
import { fmtDate } from '@/lib/format';
import { COUNTRIES, COUNTRY_ORDER, STATUS_LABEL, STATUS_LEVEL, type Country } from '@vendorhub/shared';

const FILTERS = [['queue', 'In queue'], ['returned', 'Returned'], ['approved', 'Approved'], ['invited', 'Invited'], ['all', 'All']] as const;
type Sort = 'date' | 'name' | 'country' | 'status';

export function Queue() {
  const me = useOutletContext<Me>();
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState<string>('queue');
  const [country, setCountry] = useState<Country | 'all'>('all');
  const [sort, setSort] = useState<Sort>('date');
  const [invite, setInvite] = useState(false);
  const { data, isLoading, error } = useVendors({ status, country: country === 'all' ? '' : country, sort });
  const rows = data?.rows ?? [];
  const SortBtn = ({ k, label }: { k: Sort; label: string }) => <button onClick={() => setSort(k)} className={`inline-flex items-center gap-1 ${sort === k ? 'text-ink' : ''}`}>{label} <ArrowUpDown size={11} className={sort === k ? 'text-gold-deep' : 'text-champagne'} /></button>;
  return (
    <div className="page-enter">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="eyebrow mb-2">Inbox</div><h1 className="text-4xl">Every vendor, <span className="accent">one place.</span></h1></div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => exportQueue(status).catch(() => toast('Export failed.', 'warn'))}><Download size={16} /> Export</button>
          {me.user.role !== 'approver' && <button className="btn-primary" onClick={() => setInvite(true)}><Plus size={16} /> Invite vendor</button>}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">{FILTERS.map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${status === k ? 'bg-gold text-white' : 'bg-white text-body hover:bg-cream'}`}>{l}</button>)}</div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="me-1 text-muted">Market:</span>
        <button onClick={() => setCountry('all')} className={`rounded-full px-2.5 py-1 ${country === 'all' ? 'bg-ink text-white' : 'bg-white text-body hover:bg-cream'}`}>All</button>
        {COUNTRY_ORDER.map((c) => <button key={c} onClick={() => setCountry(c)} className={`rounded-full px-2.5 py-1 ${country === c ? 'bg-ink text-white' : 'bg-white text-body hover:bg-cream'}`}>{COUNTRIES[c].flag} {c}</button>)}
      </div>
      <ErrorBox error={error} className="mt-4" />
      {isLoading ? <div className="mt-4"><TableSkeleton /></div> : rows.length === 0 ? (
        <div className="card mt-4"><EmptyState title="Nothing here" text={status === 'queue' ? 'No vendors are waiting for a decision.' : 'No vendors match this filter.'} action={me.user.role !== 'approver' ? <button className="btn-primary" onClick={() => setInvite(true)}><Plus size={16} /> Invite a vendor</button> : undefined} /></div>
      ) : (
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
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
                const open = !['invited', 'draft', 'expired'].includes(v.status);
                return (
                  <tr key={v.id} className={`border-t border-greige hover:bg-cream/40 ${open ? 'cursor-pointer' : ''}`} onClick={() => open && navigate(`/app/vendors/${v.id}`)}>
                    <td className="px-4 py-3"><div className="font-medium text-ink">{v.name || <span className="text-muted">Awaiting registration</span>}</div><div className="text-xs text-muted">{v.email} · {v.category}</div></td>
                    <td className="px-4 py-3 text-body">{COUNTRIES[v.country].flag} {COUNTRIES[v.country].name}</td>
                    <td className="px-4 py-3 text-body">{v.submittedAt ? fmtDate(v.submittedAt) : <span className="text-muted">Invited {fmtDate(v.invitedAt)}</span>}{v.overdueDays ? <span className="ms-2 chip bg-fail-bg text-fail">{v.overdueDays}d overdue</span> : null}</td>
                    <td className="px-4 py-3"><LevelChip level={STATUS_LEVEL[v.status]} label={STATUS_LABEL[v.status]} /></td>
                    <td className="px-4 py-3">{open ? <LevelChip level={v.summary.level} label={v.summary.text} /> : <span className="text-xs text-muted">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-body">{v.assignee ? v.assignee.split(' ')[0] : <span className="text-muted">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {open ? <Link to={`/app/vendors/${v.id}`} className="btn-secondary !py-1.5 text-xs">{v.status === 'submitted' || v.status === 'in_review' ? 'Review' : 'Open'} <ArrowRight size={14} /></Link> : <Link to={`/app/vendors/${v.id}`} className="btn-ghost !py-1.5 text-xs">Details</Link>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {invite && <InviteModal onClose={() => setInvite(false)} />}
    </div>
  );
}
