import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Send, ShieldAlert, UserRound, Eye } from 'lucide-react';
import { OPEN_LINKS_IN_NEW_TAB } from '@/lib/routerMode';
import { useToast } from '@/components/Toast';
import { useStore } from '@/app/store';
import { DocViewer } from '@/components/DocViewer';
import { CheckRow } from '@/components/CheckRow';
import { SourceChip, LevelChip } from '@/components/StatusChip';
import { CHECKLISTS, COUNTRY_LABELS } from '@/data/checklists';
import { reviewChecks, STATUS_LABEL, STATUS_LEVEL } from '@/lib/reviewChecks';
import { formatIban } from '@/lib/iban';
import { fmtDate } from '@/lib/format';
import type { FieldSource, Vendor } from '@/lib/types';
import { SapSheet } from './SapSheet';
import { AuditTrail } from './AuditTrail';
import { Notes } from './Notes';
import { ReturnModal } from './ReturnModal';
import { ApproveModal } from './ApproveModal';

function FieldRow({ label, value, source, title }: { label: string; value: string; source: FieldSource; title?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-[11px] text-muted">{label}</div>
        <div className="truncate text-sm text-ink">{value || '—'}</div>
      </div>
      <SourceChip source={source} title={title} />
    </div>
  );
}

export function VendorReview() {
  const { id = '', tab = 'review' } = useParams();
  const store = useStore();
  const navigate = useNavigate();
  const vendor = store.getVendor(id);
  const [modal, setModal] = useState<'approve' | 'return' | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (vendor && vendor.status === 'submitted') {
      const assign = store.state.settings.autoAssign && !vendor.assignee;
      store.update(vendor.id, (v) => ({ ...v, status: 'in_review', reviewStartedAt: new Date().toISOString(), assignee: assign ? store.currentUser : v.assignee }));
      store.audit(vendor.id, store.currentUser, 'review', assign ? `Opened for review · assigned to ${store.currentUser}` : 'Opened for review');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor?.id, vendor?.status]);

  if (!vendor) return <div className="text-sm text-muted">Vendor not found. <Link to="/procurement/queue" className="underline">Back to queue</Link></div>;

  const summary = reviewChecks(vendor, store.state.sapVendors);
  const slots = CHECKLISTS[vendor.country];
  const c = COUNTRY_LABELS[vendor.country];
  const official: FieldSource = vendor.company.verifiedBy ? 'official' : 'ai';
  const sod = store.state.settings.segregationOfDuties && vendor.invitedBy === store.currentUser;
  const other = store.currentUser === 'Deena (Approver)' ? 'Hana (Requester)' : 'Deena (Approver)';
  const canAct = vendor.status === 'in_review' || vendor.status === 'submitted';
  const tabCls = ({ isActive }: { isActive: boolean }) => `rounded-xl px-3.5 py-2 text-sm font-medium ${isActive ? 'bg-cream text-ink' : 'text-body hover:bg-greige'}`;

  return (
    <div>
      <Link to="/procurement/queue" className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"><ArrowLeft size={14} /> Queue</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-1">{c.flag} {c.en} · {vendor.category}</div>
          <h1 className="text-3xl">{vendor.name || vendor.email}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <LevelChip level={STATUS_LEVEL[vendor.status]} label={STATUS_LABEL[vendor.status]} />
            <span>Submitted {fmtDate(vendor.submittedAt)}</span>
            <span>· Invited by {vendor.invitedBy}</span>
            {vendor.approvedBy && <span>· Approved by {vendor.approvedBy}</span>}
            <span>· Assignee: {vendor.assignee ? vendor.assignee.split(' ')[0] : 'none'}</span>
            <Link to={`/vendor/${vendor.inviteId}`} target={OPEN_LINKS_IN_NEW_TAB ? '_blank' : undefined} className="inline-flex items-center gap-1 text-teal underline"><Eye size={12} /> Vendor's view</Link>
            {canAct && vendor.assignee !== store.currentUser && (
              <button className="text-gold-deep underline" onClick={() => { store.patch(vendor.id, { assignee: store.currentUser }); store.audit(vendor.id, store.currentUser, 'review', `Assigned to ${store.currentUser}`); }}>Assign to me</button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex gap-1 rounded-2xl bg-white p-1 shadow-soft">
            <NavLink to={`/procurement/vendors/${vendor.id}`} end className={tabCls}>Review</NavLink>
            <NavLink to={`/procurement/vendors/${vendor.id}/sap`} className={tabCls}>SAP keying sheet</NavLink>
            <NavLink to={`/procurement/vendors/${vendor.id}/audit`} className={tabCls}>Audit trail <span className="text-muted">{vendor.audit.length}</span></NavLink>
          </nav>
          {canAct && (
            <div className="flex items-center gap-2" data-tour="decision">
              <button className="btn-secondary" onClick={() => setModal('return')}><Send size={15} /> Return</button>
              <button className="btn-primary" disabled={sod || summary.fails > 0} onClick={() => setModal('approve')} title={sod ? `${store.currentUser} invited this vendor` : summary.fails ? 'Fix the failed checks first' : undefined}><CheckCircle2 size={15} /> Approve</button>
            </div>
          )}
        </div>
      </div>

      {tab === 'sap' && <SapSheet vendor={vendor} />}
      {tab === 'audit' && <div data-tour="audit"><AuditTrail vendor={vendor} /></div>}
      {tab === 'review' && (
        <div className="page-enter mt-6 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div>
            <DocViewer docs={vendor.documents} slots={slots} />
          </div>
          <div className="space-y-5">
            <section className="card p-5" data-tour="extracted">
              <div className="eyebrow">Extracted fields</div>
              <div className="mt-2 divide-y divide-greige">
                <FieldRow label={c.regLabel} value={vendor.company.regNumber} source={official} title={official === 'official' ? `${c.registry} (simulated)` : undefined} />
                <FieldRow label="Legal name" value={vendor.company.legalName} source={official} />
                <FieldRow label="Legal name (Arabic)" value={vendor.company.legalNameAr} source={official} />
                <FieldRow label="Registration expiry" value={vendor.company.expiryDate} source={official} />
                <FieldRow label={c.taxLabel} value={vendor.tax.vatNumber} source={summary.duplicates.some((d) => d.on.includes('vat')) ? 'review' : 'ai'} />
                <FieldRow label="IBAN" value={formatIban(vendor.bank.iban)} source={summary.checks.find((x) => x.id === 'iban')?.level === 'pass' ? 'ai' : 'review'} />
                <FieldRow label="Account holder" value={vendor.bank.accountHolder} source={summary.checks.find((x) => x.id === 'holder')?.level === 'pass' ? 'ai' : 'review'} />
                <FieldRow label="Bank" value={vendor.bank.bankName} source="ai" />
                <FieldRow label="Accounts receivable contact" value={`${vendor.contacts.ar.name} · ${vendor.contacts.ar.email}`} source="ai" />
              </div>
            </section>

            <section className="card p-5" data-tour="checks">
              <div className="flex items-center justify-between">
                <div className="eyebrow">Checks</div>
                <LevelChip level={summary.fails ? 'fail' : summary.flags ? 'flag' : 'pass'} label={`${summary.passed} of ${summary.checks.length} passed · ${summary.docsPassed}/${summary.docsTotal} documents`} />
              </div>
              {([['Bank', ['iban', 'holder', 'bankLetter']], ['Identity', ['names', 'expiry']], ['Compliance', ['duplicate', 'sanctions']]] as const).map(([group, ids]) => (
                <div key={group} className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{group}</div>
                  <div className="divide-y divide-greige">
                    {summary.checks.filter((ch) => (ids as readonly string[]).includes(ch.id)).map((ch) => <CheckRow key={ch.id} level={ch.level} label={ch.label} reason={ch.reason} simulated={ch.simulated} />)}
                  </div>
                </div>
              ))}
              {summary.duplicates[0] && (
                <div className="mt-3 rounded-xl bg-flag-bg p-3 text-xs text-flag">
                  <div className="font-semibold">Existing SAP vendor {summary.duplicates[0].sap.code}</div>
                  <div>{summary.duplicates[0].sap.name} · {summary.duplicates[0].sap.nameAr} · tax {summary.duplicates[0].sap.vatNumber} · created {fmtDate(summary.duplicates[0].sap.createdAt)}</div>
                </div>
              )}
            </section>

            <section className="card p-5">
              <div className="eyebrow">Decision</div>
              {canAct ? (
                <>
                  {sod && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-flag-bg p-3 text-xs text-flag">
                      <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold">Segregation of duties</div>
                        {store.currentUser} invited this vendor, so a different person must approve. Switch to {other} to continue.
                        <button className="ml-2 underline" onClick={() => store.setUser(other)}>Switch to {other.split(' ')[0]}</button>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button className="btn-primary" disabled={sod || summary.fails > 0} onClick={() => setModal('approve')} title={summary.fails ? 'Fix the failed checks first' : undefined}><CheckCircle2 size={16} /> Approve</button>
                    <button className="btn-secondary" onClick={() => setModal('return')}><Send size={16} /> Return to vendor</button>
                    <span className="ms-auto flex items-center gap-1 text-xs text-muted"><UserRound size={13} /> Approver: {store.currentUser}</span>
                  </div>
                  <p className="mt-3 text-xs text-muted">Bank details always stay with a person. Approval requires a confirmed call-back on new bank details.</p>
                </>
              ) : (
                <div className="mt-3 text-sm text-body">
                  {vendor.status === 'returned' && <>Returned to the vendor on {fmtDate(vendor.returnNote?.sentAt)} by {vendor.returnNote?.by}. Waiting for an updated submission.</>}
                  {vendor.status === 'approved' && <>Approved by {vendor.approvedBy} on {fmtDate(vendor.approvedAt)}. <Link to={`/procurement/vendors/${vendor.id}/sap`} className="text-gold-deep underline">Open the SAP keying sheet</Link> to issue the vendor code.</>}
                  {vendor.status === 'code_issued' && <>Vendor code <span className="font-mono font-semibold text-ink">{vendor.vendorCode}</span> issued on {fmtDate(vendor.codeIssuedAt)}. The vendor has been notified (simulated).</>}
                </div>
              )}
            </section>
            <Notes vendor={vendor} />
          </div>
        </div>
      )}

      {modal === 'approve' && <ApproveModal vendor={vendor} onClose={() => setModal(null)} onApproved={() => { setModal(null); toast(`${vendor.name} approved. SAP keying sheet ready.`); navigate(`/procurement/vendors/${vendor.id}/sap`); }} />}
      {modal === 'return' && <ReturnModal vendor={vendor} summary={summary} onClose={() => setModal(null)} />}
    </div>
  );
}

export type { Vendor };
