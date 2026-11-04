import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useEmails } from '@/api/hooks';
import { Modal } from '@/components/Modal';
import { TableSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { fmtDateTime } from '@/lib/format';
import type { Email } from '@vendorhub/shared';

const KIND: Record<Email['kind'], { label: string; cls: string }> = {
  invite: { label: 'Invite', cls: 'bg-cream text-gold-deep' }, reminder: { label: 'Reminder', cls: 'bg-cream text-gold-deep' }, submitted: { label: 'Received', cls: 'bg-greige text-body' },
  returned: { label: 'Returned', cls: 'bg-flag-bg text-flag' }, approved: { label: 'Approved', cls: 'bg-pass-bg text-pass' }, code_issued: { label: 'Vendor code', cls: 'bg-pass-bg text-pass' },
  magic_link: { label: 'Sign-in link', cls: 'bg-greige text-body' }, rejected: { label: 'Rejected', cls: 'bg-fail-bg text-fail' },
};

export function EmailList({ vendorId }: { vendorId?: string }) {
  const { data, isLoading } = useEmails(vendorId);
  const [open, setOpen] = useState<Email | null>(null);
  const rows = data?.rows ?? [];
  if (isLoading) return <TableSkeleton rows={4} />;
  if (rows.length === 0) return <div className="card"><EmptyState title="No messages yet" text="Invitations, confirmations, return notes and vendor codes will appear here." /></div>;
  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-greige/60 text-left text-[11px] uppercase tracking-wide text-muted"><tr><th className="px-4 py-3 font-semibold">Sent</th><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">To</th><th className="px-4 py-3 font-semibold">Subject</th><th className="px-4 py-3 font-semibold">Delivery</th></tr></thead>
          <tbody>{rows.map((e) => (
            <tr key={e.id} className="cursor-pointer border-t border-greige hover:bg-cream/40" onClick={() => setOpen(e)}>
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">{fmtDateTime(e.at)}</td>
              <td className="px-4 py-2.5"><span className={`chip ${KIND[e.kind]?.cls ?? 'bg-greige'}`}>{KIND[e.kind]?.label ?? e.kind}</span></td>
              <td className="px-4 py-2.5 text-body">{e.to}</td>
              <td className="px-4 py-2.5 text-ink">{e.subject}</td>
              <td className="px-4 py-2.5 text-xs">{e.error ? <span className="text-fail">Failed</span> : e.delivery === 'smtp' ? <span className="text-pass">Sent</span> : <span className="text-muted">Outbox only</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {open && (
        <Modal onClose={() => setOpen(null)} wide eyebrow={`${fmtDateTime(open.at)} · to ${open.to}`} title={open.subject}>
          {open.vendorId && <Link to={`/app/vendors/${open.vendorId}`} className="text-xs text-gold-deep underline">Open vendor</Link>}
          {open.error && <div className="mt-2 rounded-xl bg-fail-bg p-3 text-xs text-fail">Delivery failed: {open.error}</div>}
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <pre className="whitespace-pre-wrap rounded-xl bg-greige/60 p-4 font-sans text-sm leading-relaxed text-body">{open.bodyEn}</pre>
            <pre className="whitespace-pre-wrap rounded-xl bg-greige/60 p-4 font-arabic text-sm leading-relaxed text-body" dir="rtl">{open.bodyAr}</pre>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Outbox() {
  return (
    <div className="page-enter">
      <div className="eyebrow mb-2">Onboarding</div>
      <h1 className="text-4xl">Outbox, <span className="accent">every message the vendor got.</span></h1>
      <p className="mt-2 flex items-center gap-1 text-sm text-body"><Mail size={14} /> Each step emails the vendor in English and Arabic. Delivery status shows whether SMTP accepted it.</p>
      <div className="mt-6"><EmailList /></div>
    </div>
  );
}
