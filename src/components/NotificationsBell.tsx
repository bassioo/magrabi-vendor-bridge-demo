import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useStore } from '@/app/store';
import { fmtDateTime, nowIso } from '@/lib/format';

export function NotificationsBell() {
  const { vendors, state, setFlags } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = vendors
    .flatMap((v) => v.audit.filter((a) => (a.kind === 'system' || a.kind === 'review') && a.actor !== state.currentUser).map((a) => ({ ...a, vendor: v })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);
  const unread = items.filter((a) => a.at > state.lastSeenAt).length;
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost relative p-2" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} data-tour="bell">
        <Bell size={18} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fail px-1 text-[10px] font-semibold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-96 overflow-hidden rounded-2xl border border-champagne/60 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-greige px-4 py-2.5">
            <div className="eyebrow">Activity</div>
            <button className="text-xs text-gold-deep hover:underline" onClick={() => setFlags({ lastSeenAt: nowIso() })}>Mark all read</button>
          </div>
          <ul className="max-h-96 overflow-auto">
            {items.map((a) => (
              <li key={a.id} className={`border-b border-greige last:border-0 ${a.at > state.lastSeenAt ? 'bg-cream/50' : ''}`}>
                <Link to={a.vendor.status === 'invited' || a.vendor.status === 'draft' ? '/procurement/queue' : `/procurement/vendors/${a.vendor.id}`} onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-cream/70">
                  <div className="text-sm text-ink">{a.vendor.name || a.vendor.email}</div>
                  <div className="text-xs text-body">{a.message}</div>
                  <div className="mt-0.5 text-[11px] text-muted">{a.actor} · {fmtDateTime(a.at)}</div>
                </Link>
              </li>
            ))}
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Nothing new.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
