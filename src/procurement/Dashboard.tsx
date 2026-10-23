import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { useStore } from '@/app/store';
import { KpiTile } from '@/components/KpiTile';
import { LevelChip } from '@/components/StatusChip';
import { daysBetween, fmtDateTime } from '@/lib/format';
import { STATUS_LABEL, STATUS_LEVEL } from '@/lib/reviewChecks';
import { COUNTRY_LABELS } from '@/data/checklists';
import { COUNTRIES, COUNTRY_ORDER } from '@/data/countries';
import { reviewChecks, checkSummaryText } from '@/lib/reviewChecks';
import { ArrowRight, PlayCircle, X, Check } from 'lucide-react';
import { CountUp } from '@/components/CountUp';
import { useTour } from '@/app/Tour';

function avg(nums: (number | null)[]): number | null {
  const xs = nums.filter((n): n is number => n !== null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function Dashboard() {
  const { vendors, state, setFlags } = useStore();
  const tour = useTour();
  const queue = vendors.filter((v) => v.status === 'submitted' || v.status === 'in_review');
  const issued = vendors.filter((v) => v.status === 'code_issued');
  const daysToCode = avg(issued.map((v) => daysBetween(v.invitedAt, v.codeIssuedAt)));
  const reviewed = vendors.filter((v) => v.firstTimeRight !== undefined && (v.status === 'approved' || v.status === 'code_issued' || v.status === 'returned' || v.returnCount > 0));
  const ftr = reviewed.length ? Math.round((reviewed.filter((v) => v.firstTimeRight).length / reviewed.length) * 100) : null;
  const now = new Date();
  const returnedThisMonth = vendors.filter((v) => v.audit.some((a) => a.message.startsWith('Returned to vendor') && new Date(a.at).getMonth() === now.getMonth() && new Date(a.at).getFullYear() === now.getFullYear())).length;

  const stages = [
    { stage: 'Invite → Submitted', days: avg(vendors.map((v) => daysBetween(v.invitedAt, v.submittedAt))) },
    { stage: 'Submitted → Reviewed', days: avg(vendors.map((v) => daysBetween(v.submittedAt, v.approvedAt))) },
    { stage: 'Reviewed → Code issued', days: avg(vendors.map((v) => daysBetween(v.approvedAt, v.codeIssuedAt))) },
  ].map((s) => ({ ...s, days: s.days === null ? 0 : Math.round(s.days * 10) / 10 }));

  const attention = queue
    .map((v) => ({ v, sum: checkSummaryText(reviewChecks(v, state.sapVendors)) }))
    .sort((a, b) => (a.sum.level === 'pass' ? 1 : 0) - (b.sum.level === 'pass' ? 1 : 0) || (a.v.submittedAt ?? '').localeCompare(b.v.submittedAt ?? ''));
  const byCountry = COUNTRY_ORDER.map((c) => ({ c, n: vendors.filter((v) => v.country === c && v.status !== 'invited' && v.status !== 'draft').length })).filter((x) => x.n > 0);
  const maxCountry = Math.max(1, ...byCountry.map((x) => x.n));
  const activity = vendors
    .flatMap((v) => v.audit.filter((a) => a.kind === 'review' || a.kind === 'system').map((a) => ({ ...a, vendor: v })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const me = state.currentUser;
  const todo = [
    { label: 'Take the 3-minute guided tour', done: state.tourDone, action: tour.start, cta: 'Start' },
    { label: 'Invite a vendor and open the link', done: vendors.some((v) => v.invitedAt > state.seededAt), to: '/procurement/queue', cta: 'Queue' },
    { label: 'Review Nile Gifts and return it with a bilingual note', done: vendors.some((v) => v.id === 'v-nile' && (v.status === 'returned' || v.returnCount > 0)), to: '/procurement/vendors/v-nile', cta: 'Review' },
    { label: 'Approve a vendor as Deena and issue the SAP code', done: vendors.some((v) => v.codeIssuedAt && v.codeIssuedAt > state.seededAt), to: '/procurement/queue', cta: 'Queue' },
  ];
  const doneCount = todo.filter((t) => t.done).length;

  return (
    <div className="page-enter">
      {!state.welcomeDismissed && (
        <section className="card relative mb-6 overflow-hidden p-6 lens-bg">
          <button className="absolute right-3 top-3 rounded-full p-1 text-muted hover:bg-greige" onClick={() => setFlags({ welcomeDismissed: true })} aria-label="Dismiss"><X size={16} /></button>
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="eyebrow">Welcome, {me.split(' ')[0]}</div>
              <h2 className="mt-1 text-3xl">Four things to try, <span className="accent">in about ten minutes.</span></h2>
              <p className="mt-2 max-w-lg text-sm text-body">This is a working demo on sample data. Everything you click is reversible with Reset demo. Start with the tour, then run one vendor end to end.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-primary" onClick={tour.start}><PlayCircle size={16} /> Take the tour</button>
                <Link to="/procurement/queue" className="btn-secondary">Go to the queue</Link>
              </div>
            </div>
            <ol className="space-y-2">
              {todo.map((t) => (
                <li key={t.label} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${t.done ? 'border-pass/30 bg-pass-bg/60 text-pass' : 'border-champagne/60 bg-white/80 text-ink'}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${t.done ? 'bg-pass text-white' : 'border border-champagne'}`}>{t.done && <Check size={12} />}</span>
                  <span className="flex-1">{t.label}</span>
                  {!t.done && (t.to ? <Link to={t.to} className="text-xs font-medium text-gold-deep hover:underline">{t.cta} →</Link> : <button className="text-xs font-medium text-gold-deep hover:underline" onClick={t.action}>{t.cta} →</button>)}
                </li>
              ))}
              <li className="px-1 text-xs text-muted">{doneCount} of {todo.length} done</li>
            </ol>
          </div>
        </section>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Vendor onboarding</div>
          <h1 className="text-4xl">Good morning, <span className="accent">{state.currentUser.split(' ')[0]}.</span></h1>
          <p className="mt-2 text-sm text-body">{queue.length} vendor{queue.length === 1 ? '' : 's'} waiting across {byCountry.length} markets. AI reads, rules check, registries confirm. You decide.</p>
        </div>
        <Link to="/procurement/queue" className="btn-primary">Open the queue <ArrowRight size={16} /></Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-tour="kpis">
        <KpiTile label="Vendors in queue" value={<CountUp value={queue.length} />} sub={`${queue.filter((v) => v.status === 'submitted').length} new · ${queue.filter((v) => v.status === 'in_review').length} in review`} accent="gold" />
        <KpiTile label="Avg days to vendor code" value={daysToCode === null ? '—' : <CountUp value={daysToCode} decimals={1} />} sub="Invite to code issued · since go-live" accent="teal" />
        <KpiTile label="First-time-right" value={ftr === null ? '—' : <CountUp value={ftr} suffix="%" />} sub={`${reviewed.filter((v) => v.firstTimeRight).length} of ${reviewed.length} reviewed without a return`} accent="pass" />
        <KpiTile label="Returned this month" value={<CountUp value={returnedThisMonth} />} sub="Sent back to the vendor with a note" accent="flag" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-5" data-tour="attention">
          <div className="flex items-center justify-between">
            <div className="eyebrow">Needs your attention</div>
            <span className="text-xs text-muted">Flags first</span>
          </div>
          <ul className="mt-3 divide-y divide-greige">
            {attention.map(({ v, sum }) => (
              <li key={v.id} className="flex items-center gap-3 py-2.5">
                <span className="text-lg">{COUNTRY_LABELS[v.country].flag}</span>
                <div className="min-w-0 flex-1">
                  <Link to={`/procurement/vendors/${v.id}`} className="block truncate text-sm font-medium text-ink hover:underline">{v.name}</Link>
                  <div className="text-xs text-muted">{v.category} · submitted {fmtDateTime(v.submittedAt)}</div>
                </div>
                <LevelChip level={sum.level} label={sum.text} />
                <Link to={`/procurement/vendors/${v.id}`} className="btn-secondary !py-1 text-xs">Review</Link>
              </li>
            ))}
            {attention.length === 0 && <li className="py-8 text-center text-sm text-muted">Queue is clear. Nothing waiting for a decision.</li>}
          </ul>
        </div>
        <div className="card p-5">
          <div className="eyebrow">Vendors by market</div>
          <div className="mt-1 text-xs text-muted">Submitted since go-live</div>
          <ul className="mt-4 space-y-2.5">
            {byCountry.map(({ c, n }) => (
              <li key={c} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-body">{COUNTRIES[c].flag} {COUNTRIES[c].name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-greige"><div className="h-full rounded-full bg-gold" style={{ width: `${(n / maxCountry) * 100}%` }} /></div>
                <span className="w-6 text-right font-medium text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="card p-5">
          <div className="eyebrow">Average days per stage</div>
          <div className="mt-1 text-xs text-muted">Sample vendors since go-live</div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stages} margin={{ top: 16, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#ECEAE4" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#8C8983' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8C8983' }} axisLine={false} tickLine={false} unit="d" />
                <Tooltip cursor={{ fill: '#FBF3E1' }} formatter={(v: number) => [`${v} days`, 'Average']} contentStyle={{ borderRadius: 12, borderColor: '#C9B488', fontSize: 12 }} />
                <Bar dataKey="days" fill="#A8884C" radius={[8, 8, 0, 0]}>
                  <LabelList dataKey="days" position="top" style={{ fontSize: 11, fill: '#3B3833' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div className="eyebrow">Recent activity</div>
            <Link to="/procurement/queue" className="text-xs font-medium text-gold-deep hover:underline">Open queue →</Link>
          </div>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {activity.map((a) => (
                <tr key={a.id} className="border-t border-greige">
                  <td className="py-2 pr-3 text-xs text-muted whitespace-nowrap">{fmtDateTime(a.at)}</td>
                  <td className="py-2 pr-3">
                    <Link to={`/procurement/vendors/${a.vendor.id}`} className="font-medium text-ink hover:underline">{a.vendor.name || a.vendor.email}</Link>
                    <span className="ml-2 text-xs text-muted">{COUNTRY_LABELS[a.vendor.country].flag} {a.vendor.country}</span>
                  </td>
                  <td className="py-2 pr-3 text-xs text-body">{a.message}</td>
                  <td className="py-2 text-right"><LevelChip level={STATUS_LEVEL[a.vendor.status]} label={STATUS_LABEL[a.vendor.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
