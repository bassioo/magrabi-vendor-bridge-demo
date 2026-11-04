import { Link, useOutletContext } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { ArrowRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { useDashboard, type Me } from '@/api/hooks';
import { KpiTile } from '@/components/KpiTile';
import { CountUp } from '@/components/CountUp';
import { LevelChip } from '@/components/StatusChip';
import { Skeleton, TableSkeleton } from '@/components/Skeleton';
import { ErrorBox } from '@/components/ErrorBox';
import { fmtDateTime } from '@/lib/format';
import { COUNTRIES, STATUS_LABEL, STATUS_LEVEL } from '@vendorhub/shared';
import { InviteModal } from './InviteModal';

export function Dashboard() {
  const me = useOutletContext<Me>();
  const { data, isLoading, error } = useDashboard();
  const [invite, setInvite] = useState(false);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  if (error) return <ErrorBox error={error} />;
  const k = data?.kpis;
  const maxCountry = Math.max(1, ...(data?.byCountry.map((x) => x.n) ?? [1]));
  return (
    <div className="page-enter">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Vendor onboarding</div>
          <h1 className="text-4xl">{greet}, <span className="accent">{me.user.name.split(' ')[0]}.</span></h1>
          <p className="mt-2 text-sm text-body">{k ? `${k.inQueue} vendor${k.inQueue === 1 ? '' : 's'} waiting${k.overdue ? `, ${k.overdue} past the ${me.settings.slaReviewDays}-day review target` : ''}.` : 'Loading…'} AI reads, rules check, registries confirm. You decide.</p>
        </div>
        <div className="flex gap-2">
          {me.user.role !== 'approver' && <button className="btn-secondary" onClick={() => setInvite(true)}><Plus size={16} /> Invite vendor</button>}
          <Link to="/app/queue" className="btn-primary">Open inbox <ArrowRight size={16} /></Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading || !k ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) : (<>
          <KpiTile label="Vendors in queue" value={<CountUp value={k.inQueue} />} sub={`${k.newCount} new · ${k.inReview} in review · ${k.overdue} overdue`} accent="gold" />
          <KpiTile label="Avg days to vendor code" value={k.avgDaysToCode === null ? '—' : <CountUp value={k.avgDaysToCode} decimals={1} />} sub="Invite to code issued" accent="teal" />
          <KpiTile label="First-time-right" value={k.firstTimeRightPct === null ? '—' : <CountUp value={k.firstTimeRightPct} suffix="%" />} sub="Reviewed without a return" accent="pass" />
          <KpiTile label="Returned this month" value={<CountUp value={k.returnedThisMonth} />} sub="Sent back to the vendor with a note" accent="flag" />
        </>)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between"><div className="eyebrow">Needs your attention</div><span className="text-xs text-muted">Overdue and flags first</span></div>
          {isLoading ? <TableSkeleton rows={3} /> : (
            <ul className="mt-3 divide-y divide-greige">
              {(data?.attention ?? []).map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-lg">{COUNTRIES[v.country].flag}</span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/app/vendors/${v.id}`} className="block truncate text-sm font-medium text-ink hover:underline">{v.name || v.email}</Link>
                    <div className="text-xs text-muted">{v.category} · submitted {fmtDateTime(v.submittedAt)}{v.assignee ? ` · ${v.assignee.split(' ')[0]}` : ''}</div>
                  </div>
                  {v.overdueDays ? <span className="chip bg-fail-bg text-fail">{v.overdueDays}d overdue</span> : null}
                  <LevelChip level={v.summary.level} label={v.summary.text} />
                  <Link to={`/app/vendors/${v.id}`} className="btn-secondary !py-1 text-xs">Review</Link>
                </li>
              ))}
              {(data?.attention ?? []).length === 0 && <li className="py-8 text-center text-sm text-muted">Inbox is clear. Nothing waiting for a decision.</li>}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <div className="eyebrow">Vendors by market</div><div className="mt-1 text-xs text-muted">Submitted, all time</div>
          <ul className="mt-4 space-y-2.5">
            {(data?.byCountry ?? []).map(({ country, n }) => (
              <li key={country} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-body">{COUNTRIES[country].flag} {COUNTRIES[country].name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-greige"><div className="h-full rounded-full bg-gold" style={{ width: `${(n / maxCountry) * 100}%` }} /></div>
                <span className="w-6 text-right font-medium text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</span>
              </li>
            ))}
            {(data?.byCountry ?? []).length === 0 && <li className="text-sm text-muted">No submissions yet.</li>}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="card p-5">
          <div className="eyebrow">Average days per stage</div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.stages ?? []} margin={{ top: 16, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#ECEAE4" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#8C8983' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8C8983' }} axisLine={false} tickLine={false} unit="d" />
                <Tooltip cursor={{ fill: '#FBF3E1' }} formatter={(v: number) => [`${v} days`, 'Average']} contentStyle={{ borderRadius: 12, borderColor: '#C9B488', fontSize: 12 }} />
                <Bar dataKey="days" fill="#A8884C" radius={[8, 8, 0, 0]}><LabelList dataKey="days" position="top" style={{ fontSize: 11, fill: '#3B3833' }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between"><div className="eyebrow">Recent activity</div><Link to="/app/queue" className="text-xs font-medium text-gold-deep hover:underline">Open inbox →</Link></div>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {(data?.activity ?? []).map((a) => (
                <tr key={a.id} className="border-t border-greige">
                  <td className="whitespace-nowrap py-2 pr-3 text-xs text-muted">{fmtDateTime(a.at)}</td>
                  <td className="py-2 pr-3"><Link to={`/app/vendors/${a.vendorId}`} className="font-medium text-ink hover:underline">{a.vendorName}</Link></td>
                  <td className="py-2 text-xs text-body">{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {invite && <InviteModal onClose={() => setInvite(false)} />}
    </div>
  );
}

export { STATUS_LABEL, STATUS_LEVEL };
