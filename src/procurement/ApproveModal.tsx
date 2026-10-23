import { useState } from 'react';
import { CheckCircle2, PhoneCall, X } from 'lucide-react';
import { useStore } from '@/app/store';
import type { Vendor } from '@/lib/types';
import { formatIban } from '@/lib/iban';

export function ApproveModal({ vendor, onClose, onApproved }: { vendor: Vendor; onClose: () => void; onApproved: () => void }) {
  const store = useStore();
  const [callback, setCallback] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const needCallback = vendor.bankIsNew && store.state.settings.requireCallback;
  const ok = confirmed && (!needCallback || callback);

  const approve = () => {
    const at = new Date().toISOString();
    store.update(vendor.id, (v) => ({ ...v, status: 'approved', approvedAt: at, approvedBy: store.currentUser, firstTimeRight: v.firstTimeRight ?? v.returnCount === 0 }));
    store.audit(vendor.id, store.currentUser, 'review', `Approved${needCallback ? ' · bank details confirmed by call-back' : ''}`, `Approver: ${store.currentUser} · Requester: ${vendor.invitedBy}`);
    store.audit(vendor.id, 'System', 'system', 'Vendor notified: approved (simulated email)');
    store.email(vendor.id, 'approved', 'MAGRABi · Your registration is approved', `Good news. ${vendor.company.legalName} is approved as a MAGRABi supplier. Your vendor code will follow once the record is created in our system.`, `خبر سار. تمت الموافقة على ${vendor.company.legalNameAr || vendor.company.legalName} كمورّد لدى مغربي. سيصلكم رمز المورّد بعد إنشاء السجل في نظامنا.`);
    onApproved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Approve vendor</div>
            <h2 className="text-2xl">{vendor.name}</h2>
          </div>
          <button className="btn-ghost p-1" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="mt-4 rounded-xl bg-greige/70 p-4 text-sm">
          <div className="text-[11px] text-muted">Bank details to be keyed into SAP</div>
          <div className="mt-1 font-mono text-ink">{formatIban(vendor.bank.iban)}</div>
          <div className="text-body">{vendor.bank.bankName} · {vendor.bank.accountHolder}</div>
        </div>
        {needCallback && (
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-champagne/70 p-3 text-sm text-body">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#A8884C]" checked={callback} onChange={(e) => setCallback(e.target.checked)} />
            <span><PhoneCall size={14} className="mb-0.5 mr-1 inline text-gold-deep" /> Bank details confirmed by call-back to {vendor.contacts.ar.name} on {vendor.contacts.ar.phone}.</span>
          </label>
        )}
        <label className="mt-3 flex items-start gap-3 text-sm text-body">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#A8884C]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          I have reviewed the documents and checks and approve this vendor as {store.currentUser}.
        </label>
        <p className="mt-3 text-xs text-muted">Bank details always stay with a person. This approval is recorded in the audit trail with your name.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!ok} onClick={approve}><CheckCircle2 size={16} /> Approve and open SAP sheet</button>
        </div>
      </div>
    </div>
  );
}
