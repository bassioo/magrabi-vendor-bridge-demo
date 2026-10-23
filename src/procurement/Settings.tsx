import { ShieldCheck, UserRound, Bell, PlayCircle } from 'lucide-react';
import { useStore } from '@/app/store';
import { useTour } from '@/app/Tour';
import { useToast } from '@/components/Toast';

const TEAM = [
  { name: 'Deena (Approver)', role: 'Approver', markets: 'All markets', email: 'deena@magrabi.example' },
  { name: 'Hana (Requester)', role: 'Requester', markets: 'All markets', email: 'hana@magrabi.example' },
  { name: 'Omar', role: 'Approver', markets: 'Egypt', email: 'omar@magrabi.example' },
  { name: 'Sara', role: 'Requester', markets: 'Kuwait · Qatar · Bahrain · Oman', email: 'sara@magrabi.example' },
];

function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-muted">{help}</span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-champagne/60 transition peer-checked:bg-gold peer-focus-visible:ring-2 peer-focus-visible:ring-gold/40" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Settings() {
  const { state, setSettings } = useStore();
  const tour = useTour();
  const toast = useToast();
  const s = state.settings;
  const set = (patch: Parameters<typeof setSettings>[0], msg: string) => { setSettings(patch); toast(msg, 'info'); };
  return (
    <div className="page-enter">
      <div className="eyebrow mb-2">Setup</div>
      <h1 className="text-4xl">Policies, <span className="accent">not code.</span></h1>
      <p className="mt-2 max-w-2xl text-sm text-body">These switches change how the review screen behaves right now. They are stored with the demo and survive a refresh.</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className="card p-5" data-tour="policies">
          <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-gold-deep" /><div className="eyebrow">Approval policies</div></div>
          <div className="mt-2 divide-y divide-greige">
            <Toggle checked={s.requireCallback} onChange={(v) => set({ requireCallback: v }, v ? 'Call-back confirmation required before approval.' : 'Call-back confirmation no longer required.')} label="Bank details confirmed by call-back" help="Approval of new bank details is blocked until the approver ticks the call-back box." />
            <Toggle checked={s.segregationOfDuties} onChange={(v) => set({ segregationOfDuties: v }, v ? 'Segregation of duties on.' : 'Segregation of duties off.')} label="Segregation of duties" help="The person who invited a vendor cannot approve that vendor." />
            <Toggle checked={s.autoAssign} onChange={(v) => set({ autoAssign: v }, v ? 'Reviews are assigned to whoever opens them.' : 'Reviews stay unassigned until someone takes them.')} label="Assign on open" help="Opening a submitted vendor assigns the review to you." />
            <div className="flex items-center justify-between gap-4 py-3">
              <span>
                <span className="block text-sm font-medium text-ink">Bank letter age limit</span>
                <span className="block text-xs text-muted">Letters older than this are rejected at upload. The country rules carry the same value.</span>
              </span>
              <select value={s.bankLetterMaxMonths} onChange={(e) => set({ bankLetterMaxMonths: Number(e.target.value) }, `Bank letters must be ${e.target.value} months old or less.`)} className="input !w-auto !py-1.5 text-sm">
                {[3, 6, 12].map((m) => <option key={m} value={m}>{m} months</option>)}
              </select>
            </div>
          </div>
        </section>

        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center gap-2"><UserRound size={16} className="text-gold-deep" /><div className="eyebrow">Team</div></div>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {TEAM.map((m) => (
                  <tr key={m.name} className="border-t border-greige first:border-0">
                    <td className="py-2 pr-3"><div className="font-medium text-ink">{m.name.replace(/ \(.*\)/, '')}</div><div className="text-xs text-muted">{m.email}</div></td>
                    <td className="py-2 pr-3"><span className={`chip ${m.role === 'Approver' ? 'bg-pass-bg text-pass' : 'bg-cream text-gold-deep'}`}>{m.role}</span></td>
                    <td className="py-2 text-xs text-body">{m.markets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">Only Deena and Hana are selectable in the demo header. The others show how roles and markets would be scoped.</p>
          </section>
          <section className="card p-5">
            <div className="flex items-center gap-2"><Bell size={16} className="text-gold-deep" /><div className="eyebrow">Notifications</div></div>
            <ul className="mt-2 space-y-1.5 text-sm text-body">
              <li>New submission in my markets · <span className="text-muted">in-app + email</span></li>
              <li>Vendor resubmitted after a return · <span className="text-muted">in-app + email</span></li>
              <li>Review waiting more than 2 working days · <span className="text-muted">email digest</span></li>
            </ul>
            <p className="mt-3 text-xs text-muted">Email delivery is simulated. See the Outbox for every message the system would have sent.</p>
          </section>
          <section className="card flex items-center justify-between gap-4 p-5">
            <div>
              <div className="eyebrow">Guided tour</div>
              <p className="mt-1 text-sm text-body">Thirteen steps through the console and the vendor side.</p>
            </div>
            <button className="btn-secondary" onClick={tour.start}><PlayCircle size={16} /> Start tour</button>
          </section>
        </div>
      </div>
    </div>
  );
}
