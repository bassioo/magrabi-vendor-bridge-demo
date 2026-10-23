import { useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { useStore } from '@/app/store';
import { useToast } from '@/components/Toast';
import type { Vendor } from '@/lib/types';
import type { ReviewSummary } from '@/lib/reviewChecks';

function draft(vendor: Vendor, summary: ReviewSummary) {
  const issues = summary.checks.filter((c) => c.level !== 'pass' && c.fixEn);
  const failedDocs = Object.values(vendor.documents).filter((d) => d.level === 'fail');
  const en = [
    `Dear ${vendor.contacts.ar.name || vendor.name},`,
    '',
    `Thank you for registering ${vendor.company.legalName || vendor.name} with MAGRABi. Our AI and rule checks ran on your submission and a person on the procurement team has reviewed it. Before we can create your vendor account, we need your help with the following:`,
    '',
    ...issues.map((c, i) => `${i + 1}. ${c.fixEn}`),
    ...failedDocs.map((d, i) => `${issues.length + i + 1}. ${d.checks.filter((c) => c.level === 'fail').map((c) => c.reason).join(' ')}`),
    '',
    'You can update and resubmit from the same link; everything else you entered is saved. If anything is unclear, reply to this email and we will help.',
    '',
    'Kind regards,',
    `${vendor.invitedBy.split(' ')[0]} · MAGRABi Procurement`,
  ].join('\n');
  const ar = [
    `الأستاذ/ة ${vendor.contacts.ar.name || vendor.name} المحترم/ة،`,
    '',
    `شكرًا لتسجيل ${vendor.company.legalNameAr || vendor.company.legalName || vendor.name} لدى مغربي. تمت مراجعة طلبكم بواسطة فحوصاتنا الآلية ثم من قِبل أحد أعضاء فريق المشتريات. وقبل إنشاء حساب المورّد، نحتاج مساعدتكم في النقاط التالية:`,
    '',
    ...issues.map((c, i) => `${i + 1}. ${c.fixAr}`),
    ...failedDocs.map((d, i) => `${issues.length + i + 1}. ${d.checks.filter((c) => c.level === 'fail').map((c) => c.reasonAr).join(' ')}`),
    '',
    'يمكنكم التحديث وإعادة الإرسال من الرابط نفسه، وكل ما أدخلتموه سابقًا محفوظ. وإذا كان هناك أي استفسار، يرجى الرد على هذا البريد وسنسعد بمساعدتكم.',
    '',
    'مع أطيب التحيات،',
    `${vendor.invitedBy.split(' ')[0]} · المشتريات، مغربي`,
  ].join('\n');
  return { en, ar, items: [...issues.map((c) => c.label), ...failedDocs.map((d) => d.slotId)] };
}

export function ReturnModal({ vendor, summary, onClose }: { vendor: Vendor; summary: ReviewSummary; onClose: () => void }) {
  const store = useStore();
  const toast = useToast();
  const initial = draft(vendor, summary);
  const [en, setEn] = useState(initial.en);
  const [ar, setAr] = useState(initial.ar);

  const send = () => {
    const at = new Date().toISOString();
    store.update(vendor.id, (v) => ({ ...v, status: 'returned', stage: 'status', returnCount: v.returnCount + 1, firstTimeRight: false, returnNote: { en, ar, sentAt: at, by: store.currentUser, items: initial.items } }));
    store.audit(vendor.id, store.currentUser, 'review', `Returned to vendor: ${initial.items.join('; ') || 'see note'}`, 'Bilingual note sent (simulated email) · AI draft edited by reviewer');
    store.email(vendor.id, 'returned', 'MAGRABi · A few things to fix in your registration', en, ar);
    toast(`Returned to ${vendor.name}. Bilingual note sent (simulated).`, 'info');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 p-4" onClick={onClose}>
      <div className="card flex max-h-[90vh] w-full max-w-4xl flex-col p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Return to vendor</div>
            <h2 className="text-2xl">A clear note, <span className="accent">in both languages.</span></h2>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted"><Sparkles size={12} className="text-gold-deep" /> Drafted from the flagged checks (simulated AI). Edit freely before sending.</p>
          </div>
          <button className="btn-ghost p-1" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="mt-4 grid flex-1 gap-4 overflow-auto md:grid-cols-2">
          <div>
            <label className="label">English</label>
            <textarea className="input min-h-[300px] text-sm leading-relaxed" value={en} onChange={(e) => setEn(e.target.value)} />
          </div>
          <div>
            <label className="label">العربية</label>
            <textarea className="input min-h-[300px] font-arabic text-sm leading-relaxed" dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <span className="me-auto text-xs text-muted">To {vendor.email} · from {store.currentUser}</span>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={send}><Send size={16} /> Send and return</button>
        </div>
      </div>
    </div>
  );
}
