import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { exportQueue, useDashboard } from '@/api/hooks';
import { KpiTile } from '@/components/KpiTile';
import { Skeleton } from '@/components/Skeleton';
import { COUNTRIES } from '@vendorhub/shared';

export function Reports() {
  const { data, isLoading } = useDashboard();
  const k = data?.kpis;
  return (
    <div className="page-enter">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="eyebrow mb-2">Reports</div><h1 className="text-4xl">How onboarding <span className="accent">is going.</span></h1></div>
        <button className="btn-secondary" onClick={() => exportQueue('all')}><Download size={16} /> Export all vendors (CSV)</button>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading || !k ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) : (<>
          <KpiTile label="Avg days to vendor code" value={k.avgDaysToCode?.toFixed(1) ?? '—'} sub="Invite to code issued" accent="teal" />
          <KpiTile label="First-time-right" value={k.firstTimeRightPct === null ? '—' : `${k.firstTimeRightPct}%`} sub="Reviewed without a return" accent="pass" />
          <KpiTile label="Returned this month" value={String(k.returnedThisMonth)} accent="flag" />
          <KpiTile label="Overdue reviews" value={String(k.overdue)} sub="Past the review target" accent="gold" />
        </>)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="eyebrow">Average days per stage</div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.stages ?? []} margin={{ top: 16, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#ECEAE4" /><XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#8C8983' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#8C8983' }} axisLine={false} tickLine={false} unit="d" />
                <Tooltip cursor={{ fill: '#FBF3E1' }} formatter={(v: number) => [`${v} days`, 'Average']} contentStyle={{ borderRadius: 12, borderColor: '#C9B488', fontSize: 12 }} />
                <Bar dataKey="days" fill="#A8884C" radius={[8, 8, 0, 0]}><LabelList dataKey="days" position="top" style={{ fontSize: 11, fill: '#3B3833' }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <div className="eyebrow">Vendors by market</div>
          <table className="mt-3 w-full text-sm"><tbody>{(data?.byCountry ?? []).map((r) => <tr key={r.country} className="border-t border-greige"><td className="py-2 text-body">{COUNTRIES[r.country].flag} {COUNTRIES[r.country].name}</td><td className="py-2 text-right font-medium text-ink">{r.n}</td></tr>)}</tbody></table>
          <div className="mt-4 border-t border-greige pt-3">
            <div className="eyebrow">Stage table</div>
            <table className="mt-2 w-full text-sm"><tbody>{(data?.stages ?? []).map((s) => <tr key={s.stage} className="border-t border-greige"><td className="py-2 text-body">{s.stage}</td><td className="py-2 text-right font-medium text-ink">{s.days} d</td></tr>)}</tbody></table>
          </div>
        </div>
      </div>
    </div>
  );
}
