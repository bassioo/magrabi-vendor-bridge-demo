import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, X } from 'lucide-react';
import { useStore } from '@/app/store';
import { fmtDateTime } from '@/lib/format';
import type { Email } from '@/lib/types';
import { SimTag } from '@/components/StatusChip';

const KIND: Record<Email['kind'], { label: string; cls: string }> = {
  invite: { label: 'Invite', cls: 'bg-cream text-gold-deep' },
  submitted: { label: 'Received', cls: 'bg-greige text-body' },
  returned: { label: 'Returned', cls: 'bg-flag-bg text-flag' },
  approved: { label: 'Approved', cls: 'bg-pass-bg text-pass' },
  code_issued: { label: 'Vendor code', cls: 'bg-pass-bg text-pass' },
  reminder: { label: 'Reminder', cls: 'bg-greige text-body' },
};

export function Outbox() {
  const { state } = useStore();
  const [open, setOpen] = useState<Email | null>(null);
  const emails = [...state.emails].sort((a, b) => b.at.localeCompare(a.at));
  const vendorOf = (id: string) => state.vendors.find((v) => v.id === id);
  return (
    <div className="page-enter">
      <div className="eyebrow mb-2">Onboarding</div>
      <h1 className="text-4xl">Outbox, <span className="accent">every message the vendor got.</span></h1>
      <p className="mt-2 text-sm text-body">Each step sends the vendor a bilingual email automatically. Delivery is simulated in the demo. <SimTag /></p>
      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-greige/60 text-left text-[11px] uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3 font-semibold">Sent</th><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">To</th><th className="px-4 py-3 font-semibold">Subject</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {emails.map((e) => {
              const v = vendorOf(e.vendorId);
              return (
                <tr key={e.id} className="cursor-pointer border-t border-greige hover:bg-cream/40" onClick={() => setOpen(e)}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">{fmtDateTime(e.at)}</td>
                  <td className="px-4 py-2.5"><span className={`chip ${KIND[e.kind].cls}`}>{KIND[e.kind].label}</span></td>
                  <td className="px-4 py-2.5"><div className="text-ink">{v?.name || e.to}</div><div className="text-xs text-muted">{e.to}</div></td>
                  <td className="px-4 py-2.5 text-body">{e.subject}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-gold-deep">Open</td>
                </tr>
              );
            })}
            {emails.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">No messages yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 p-4" onClick={() => setOpen(null)}>
          <div className="card flex max-h-[90vh] w-full max-w-3xl flex-col p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted"><Mail size={14} /> {fmtDateTime(open.at)} · to {open.to} <SimTag text="simulated email" /></div>
                <h2 className="mt-1 text-xl">{open.subject}</h2>
                {vendorOf(open.vendorId) && <Link to={`/procurement/vendors/${open.vendorId}`} className="text-xs text-gold-deep underline">Open vendor</Link>}
              </div>
              <button className="btn-ghost p-1" onClick={() => setOpen(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="mt-4 grid flex-1 gap-4 overflow-auto md:grid-cols-2">
              <pre className="whitespace-pre-wrap rounded-xl bg-greige/60 p-4 font-sans text-sm leading-relaxed text-body">{open.bodyEn}</pre>
              <pre className="whitespace-pre-wrap rounded-xl bg-greige/60 p-4 font-arabic text-sm leading-relaxed text-body" dir="rtl">{open.bodyAr}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
