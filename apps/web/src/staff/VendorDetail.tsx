import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Send, ShieldAlert, Eye, RefreshCw, XCircle, MessageSquare, Copy, Check, Download, KeyRound, Upload, Sparkles, Scale, Landmark, UserRound, Cog, Mail } from 'lucide-react';
import { downloadSapSheet, useAddNote, useApprove, useAssign, useCallback_, useIssueCode, useRecheck, useReject, useResendInvite, useReturn, useReturnDraft, useSapSheet, useVendor, type Me } from '@/api/hooks';
import { DocViewer } from '@/components/DocViewer';
import { CheckRow } from '@/components/CheckRow';
import { SourceChip, LevelChip } from '@/components/StatusChip';
import { Modal } from '@/components/Modal';
import { ErrorBox } from '@/components/ErrorBox';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { EmailList } from './Outbox';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { COUNTRIES, STATUS_LABEL, STATUS_LEVEL, formatIban, type AuditEntry, type FieldSource, type Vendor, type ReviewSummary } from '@vendorhub/shared';

function FieldRow({ label, value, source, title }: { label: string; value: string; source: FieldSource; title?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0"><div className="text-[11px] text-muted">{label}</div><div className="truncate text-sm text-ink">{value || '—'}</div></div>
      <SourceChip source={source} title={title} />
    </div>
  );
}

export function VendorDetail() {
  const { id = '', tab = 'review' } = useParams();
  const me = useOutletContext<Me>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading, error } = useVendor(id);
  const [modal, setModal] = useState<'approve' | 'return' | 'reject' | null>(null);
  const assign = useAssign(id);
  const recheck = useRecheck(id);
  const resend = useResendInvite(id);

  if (error) return <div><ErrorBox error={error} /><Link to="/app/queue" className="btn-ghost mt-3">Back to inbox</Link></div>;
  if (isLoading || !data) return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-96 w-full" /></div>;
  const { vendor, summary, inviteLink } = data;
  const c = COUNTRIES[vendor.country];
  const docs = vendor.documents ?? [];
  const official: FieldSource = vendor.company.verifiedBy ? 'official' : 'manual';
  const canAct = vendor.status === 'in_review' || vendor.status === 'submitted';
  const canApprove = me.user.role === 'admin' || me.user.role === 'approver';
  const sod = me.settings.segregationOfDuties && vendor.invitedBy === me.user.name;
  const pending = !['invited', 'draft', 'expired'].includes(vendor.status);
  const tabCls = ({ isActive }: { isActive: boolean }) => `rounded-xl px-3.5 py-2 text-sm font-medium ${isActive ? 'bg-cream text-ink' : 'text-body hover:bg-greige'}`;
  const level = (id: ReviewSummary['checks'][number]['id']) => summary.checks.find((x) => x.id === id)?.level;

  return (
    <div className="page-enter">
      <Link to="/app/queue" className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"><ArrowLeft size={14} /> Inbox</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-1">{c.flag} {c.name} · {vendor.category}</div>
          <h1 className="text-3xl">{vendor.name || vendor.email}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <LevelChip level={STATUS_LEVEL[vendor.status]} label={STATUS_LABEL[vendor.status]} />
            {vendor.submittedAt && <span>Submitted {fmtDate(vendor.submittedAt)}</span>}
            <span>· Invited by {vendor.invitedBy}</span>
            {vendor.approvedBy && <span>· Approved by {vendor.approvedBy}</span>}
            <span>· Assignee: {vendor.assignee ? vendor.assignee.split(' ')[0] : 'none'}</span>
            {canAct && vendor.assignee !== me.user.name && <button className="text-gold-deep underline" onClick={() => assign.mutate({}, { onSuccess: () => toast('Assigned to you.') })}>Assign to me</button>}
            <a href={inviteLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal underline"><Eye size={12} /> Vendor's view</a>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex gap-1 rounded-2xl bg-white p-1 shadow-soft">
            <NavLink to={`/app/vendors/${vendor.id}`} end className={tabCls}>Review</NavLink>
            <NavLink to={`/app/vendors/${vendor.id}/sap`} className={tabCls}>SAP sheet</NavLink>
            <NavLink to={`/app/vendors/${vendor.id}/audit`} className={tabCls}>Audit trail <span className="text-muted">{vendor.audit?.length ?? 0}</span></NavLink>
            <NavLink to={`/app/vendors/${vendor.id}/emails`} className={tabCls}>Emails</NavLink>
          </nav>
          {canAct && canApprove && (
            <div className="flex items-center gap-2">
              <button className="btn-ghost text-fail" onClick={() => setModal('reject')}><XCircle size={15} /> Reject</button>
              <button className="btn-secondary" onClick={() => setModal('return')}><Send size={15} /> Return</button>
              <button className="btn-primary" disabled={sod || summary.fails > 0} onClick={() => setModal('approve')} title={sod ? 'You invited this vendor; someone else must approve' : summary.fails ? 'Fix the failed checks first' : undefined}><CheckCircle2 size={15} /> Approve</button>
            </div>
          )}
          {canAct && !canApprove && <button className="btn-secondary" onClick={() => setModal('return')}><Send size={15} /> Return to vendor</button>}
        </div>
      </div>

      {!pending && (
        <div className="card mt-6 p-6">
          <div className="eyebrow">Invitation</div>
          <p className="mt-2 text-sm text-body">{vendor.status === 'expired' ? 'This invitation has expired.' : 'The vendor has not submitted yet.'} Invited {fmtDateTime(vendor.invitedAt)}, valid until {fmtDate(vendor.inviteExpiresAt)}.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-greige px-2 py-1 text-xs">{inviteLink}</code>
            <button className="btn-secondary !py-1 text-xs" onClick={() => navigator.clipboard.writeText(inviteLink).then(() => toast('Link copied.')).catch(() => toast('Copy failed.', 'warn'))}><Copy size={13} /> Copy</button>
            <button className="btn-secondary !py-1 text-xs" disabled={resend.isPending} onClick={() => resend.mutate(undefined, { onSuccess: () => toast('New invitation sent. The old link no longer works.') })}><RefreshCw size={13} /> Resend invitation</button>
          </div>
        </div>
      )}

      {tab === 'sap' && <SapSheet vendor={vendor} canIssue={canApprove} />}
      {tab === 'audit' && <AuditTrail entries={vendor.audit ?? []} />}
      {tab === 'emails' && <div className="mt-6"><EmailList vendorId={vendor.id} /></div>}
      {tab === 'review' && pending && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div><DocViewer docs={docs} slots={c.checklist} /></div>
          <div className="space-y-5">
            <section className="card p-5">
              <div className="eyebrow">Extracted fields</div>
              <div className="mt-2 divide-y divide-greige">
                <FieldRow label={c.regLabel} value={vendor.company.regNumber} source={official} title={vendor.company.verifiedBy ? `${vendor.company.verifiedBy} · ${fmtDateTime(vendor.company.verifiedAt)}` : undefined} />
                <FieldRow label="Legal name" value={vendor.company.legalName} source={official} />
                <FieldRow label="Legal name (Arabic)" value={vendor.company.legalNameAr} source={official} />
                <FieldRow label="Registration expiry" value={vendor.company.expiryDate} source={level('expiry') === 'fail' ? 'review' : official} />
                {c.tax.applicable && <FieldRow label={c.tax.label} value={vendor.tax.vatNumber} source={level('tax') === 'pass' ? 'official' : level('duplicate') === 'flag' ? 'review' : 'manual'} />}
                <FieldRow label="IBAN" value={formatIban(vendor.bank.iban)} source={level('iban') === 'pass' ? 'ai' : 'review'} />
                <FieldRow label="Account holder" value={vendor.bank.accountHolder} source={level('holder') === 'pass' ? 'ai' : 'review'} />
                <FieldRow label="Bank" value={vendor.bank.bankName} source="manual" />
                <FieldRow label="Accounts receivable contact" value={`${vendor.contacts.ar.name} · ${vendor.contacts.ar.email}`} source="manual" />
              </div>
            </section>
            <section className="card p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="eyebrow">Checks</div>
                <div className="flex items-center gap-2">
                  <LevelChip level={summary.fails ? 'fail' : summary.flags ? 'flag' : summary.checks.some((x) => x.level === 'pending') ? 'pending' : 'pass'} label={`${summary.passed} of ${summary.checks.length} passed · ${summary.docsPassed}/${summary.docsTotal} documents`} />
                  <button className="btn-ghost !py-1 text-xs" disabled={recheck.isPending} onClick={() => recheck.mutate(undefined, { onSuccess: () => toast('Registry checks re-run.') })}><RefreshCw size={12} className={recheck.isPending ? 'animate-spin' : ''} /> Recheck</button>
                </div>
              </div>
              {([['Bank', ['iban', 'holder', 'bankLetter']], ['Identity', ['registry', 'tax', 'names', 'expiry']], ['Compliance', ['duplicate', 'sanctions']]] as const).map(([group, ids]) => (
                <div key={group} className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{group}</div>
                  <div className="divide-y divide-greige">{summary.checks.filter((ch) => (ids as readonly string[]).includes(ch.id)).map((ch) => <CheckRow key={ch.id} level={ch.level} label={ch.label} reason={ch.reason} simulated={ch.simulated} />)}</div>
                </div>
              ))}
              {data.sapMatch && <div className="mt-3 rounded-xl bg-flag-bg p-3 text-xs text-flag"><div className="font-semibold">Existing SAP vendor {data.sapMatch.sap.code}</div><div>{data.sapMatch.sap.name} · {data.sapMatch.sap.nameAr} · tax {data.sapMatch.sap.vatNumber || '—'} · created {fmtDate(data.sapMatch.sap.createdAt)}</div></div>}
            </section>
            <section className="card p-5">
              <div className="eyebrow">Decision</div>
              {canAct ? (
                <>
                  {sod && <div className="mt-3 flex items-start gap-2 rounded-xl bg-flag-bg p-3 text-xs text-flag"><ShieldAlert size={16} className="mt-0.5 shrink-0" /><div><div className="font-semibold">Segregation of duties</div>You invited this vendor, so a different approver must sign off.</div></div>}
                  {!canApprove && <p className="mt-3 text-sm text-body">Only approvers can approve. You can add notes or return the file to the vendor.</p>}
                  {vendor.callbackConfirmedBy && <p className="mt-3 text-xs text-pass"><CheckCircle2 size={12} className="mb-0.5 me-1 inline" />Bank details confirmed by call-back by {vendor.callbackConfirmedBy} on {fmtDateTime(vendor.callbackConfirmedAt)}.</p>}
                  <p className="mt-3 text-xs text-muted">Bank details always stay with a person. Approval of new bank details requires a confirmed call-back{me.settings.requireCallback ? '' : ' (switched off in Settings)'}.</p>
                </>
              ) : (
                <div className="mt-3 text-sm text-body">
                  {vendor.status === 'returned' && <>Returned on {fmtDate(vendor.returnNote?.sentAt)} by {vendor.returnNote?.by}. Waiting for the vendor to update and resubmit.</>}
                  {vendor.status === 'approved' && <>Approved by {vendor.approvedBy} on {fmtDate(vendor.approvedAt)}. <Link to={`/app/vendors/${vendor.id}/sap`} className="text-gold-deep underline">Open the SAP sheet</Link> to issue the vendor code.</>}
                  {vendor.status === 'code_issued' && <>Vendor code <span className="font-mono font-semibold text-ink">{vendor.vendorCode}</span> issued on {fmtDate(vendor.codeIssuedAt)}. The vendor has been notified.</>}
                  {vendor.status === 'rejected' && <>Rejected. See the audit trail for the reason.</>}
                </div>
              )}
            </section>
            <Notes vendor={vendor} />
          </div>
        </div>
      )}

      {modal === 'approve' && <ApproveModal vendor={vendor} requireCallback={me.settings.requireCallback} onClose={() => setModal(null)} onApproved={() => { setModal(null); toast(`${vendor.name} approved.`); navigate(`/app/vendors/${vendor.id}/sap`); }} />}
      {modal === 'return' && <ReturnModal vendor={vendor} onClose={() => setModal(null)} />}
      {modal === 'reject' && <RejectModal vendor={vendor} onClose={() => setModal(null)} />}
    </div>
  );
}

function ApproveModal({ vendor, requireCallback, onClose, onApproved }: { vendor: Vendor; requireCallback: boolean; onClose: () => void; onApproved: () => void }) {
  const callback = useCallback_(vendor.id);
  const approve = useApprove(vendor.id);
  const need = vendor.bankIsNew && requireCallback && !vendor.callbackConfirmedBy;
  const [ticked, setTicked] = useState(false);
  const [phone, setPhone] = useState(vendor.contacts.ar.phone);
  const [confirmed, setConfirmed] = useState(false);
  const ok = confirmed && (!need || (ticked && phone.trim()));
  const run = async () => {
    try {
      if (need) await callback.mutateAsync({ confirmed: true, phone: phone.trim() });
      await approve.mutateAsync();
      onApproved();
    } catch { /* errors shown below */ }
  };
  return (
    <Modal eyebrow="Approve vendor" title={vendor.name} onClose={onClose} footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={!ok || approve.isPending || callback.isPending} onClick={run}><CheckCircle2 size={16} /> Approve and open SAP sheet</button></>}>
      <div className="rounded-xl bg-greige/70 p-4 text-sm"><div className="text-[11px] text-muted">Bank details to be keyed into SAP</div><div className="mt-1 font-mono text-ink">{formatIban(vendor.bank.iban)}</div><div className="text-body">{vendor.bank.bankName} · {vendor.bank.accountHolder}</div></div>
      {need && (
        <div className="mt-4 space-y-3 rounded-xl border border-champagne/70 p-3">
          <label className="flex items-start gap-3 text-sm text-body"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#A8884C]" checked={ticked} onChange={(e) => setTicked(e.target.checked)} />I called {vendor.contacts.ar.name} and confirmed the bank details verbally.</label>
          <div><label className="label" htmlFor="cb-phone">Number called</label><input id="cb-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
      )}
      <label className="mt-3 flex items-start gap-3 text-sm text-body"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#A8884C]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />I have reviewed the documents and checks and approve this vendor.</label>
      <ErrorBox error={approve.error ?? callback.error} className="mt-3" />
      <p className="mt-3 text-xs text-muted">Recorded in the audit trail with your name.</p>
    </Modal>
  );
}

function ReturnModal({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const draft = useReturnDraft(vendor.id, true);
  const send = useReturn(vendor.id);
  const toast = useToast();
  const [en, setEn] = useState('');
  const [ar, setAr] = useState('');
  useEffect(() => { if (draft.data) { setEn(draft.data.en); setAr(draft.data.ar); } }, [draft.data]);
  return (
    <Modal wide eyebrow="Return to vendor" title={<>A clear note, <span className="accent">in both languages.</span></>} onClose={onClose} footer={<><span className="me-auto text-xs text-muted">To {vendor.email}</span><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={send.isPending || !en.trim()} onClick={() => send.mutate({ en, ar, items: draft.data?.items ?? [] }, { onSuccess: () => { toast(`Returned to ${vendor.name}. Note sent.`, 'info'); onClose(); } })}><Send size={16} /> Send and return</button></>}>
      <p className="flex items-center gap-1 text-xs text-muted"><Sparkles size={12} className="text-gold-deep" /> Drafted from the flagged checks. Edit freely before sending.</p>
      {draft.isLoading ? <Skeleton className="mt-3 h-60" /> : (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div><label className="label">English</label><textarea className="input min-h-[280px] text-sm leading-relaxed" value={en} onChange={(e) => setEn(e.target.value)} /></div>
          <div><label className="label">العربية</label><textarea className="input min-h-[280px] font-arabic text-sm leading-relaxed" dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} /></div>
        </div>
      )}
      <ErrorBox error={send.error ?? draft.error} className="mt-3" />
    </Modal>
  );
}

function RejectModal({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const reject = useReject(vendor.id);
  const toast = useToast();
  const [reason, setReason] = useState('');
  return (
    <Modal eyebrow="Reject vendor" title={vendor.name} onClose={onClose} footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary !bg-fail hover:!bg-fail/90" disabled={reason.trim().length < 5 || reject.isPending} onClick={() => reject.mutate(reason.trim(), { onSuccess: () => { toast('Vendor rejected.', 'warn'); onClose(); } })}><XCircle size={16} /> Reject</button></>}>
      <p className="text-sm text-body">Rejecting closes the file. The vendor is told, with the reason below. Use Return instead if they can fix something.</p>
      <label className="label mt-4" htmlFor="rej">Reason (shown to the vendor)</label>
      <textarea id="rej" className="input min-h-[120px]" value={reason} onChange={(e) => setReason(e.target.value)} />
      <ErrorBox error={reject.error} className="mt-3" />
    </Modal>
  );
}

function Notes({ vendor }: { vendor: Vendor }) {
  const add = useAddNote(vendor.id);
  const [text, setText] = useState('');
  const submit = () => { if (text.trim()) add.mutate(text.trim(), { onSuccess: () => setText('') }); };
  return (
    <section className="card p-5">
      <div className="flex items-center gap-2"><MessageSquare size={16} className="text-gold-deep" /><div className="eyebrow">Internal notes</div><span className="text-xs text-muted">· never shown to the vendor</span></div>
      <ul className="mt-3 space-y-3">
        {(vendor.notes ?? []).map((n) => <li key={n.id} className="rounded-xl bg-greige/60 p-3"><div className="text-sm text-ink">{n.text}</div><div className="mt-1 text-[11px] text-muted">{n.by} · {fmtDateTime(n.at)}</div></li>)}
        {(vendor.notes ?? []).length === 0 && <li className="text-sm text-muted">No notes yet.</li>}
      </ul>
      <div className="mt-3 flex gap-2"><input className="input" placeholder="Add a note for the team…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} aria-label="New note" /><button className="btn-secondary shrink-0" onClick={submit} disabled={!text.trim() || add.isPending}><Send size={14} /></button></div>
    </section>
  );
}

function SapSheet({ vendor, canIssue }: { vendor: Vendor; canIssue: boolean }) {
  const ready = vendor.status === 'approved' || vendor.status === 'code_issued';
  const sheet = useSapSheet(vendor.id, ready);
  const issue = useIssueCode(vendor.id);
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState(vendor.vendorCode ?? '');
  if (!ready) return <div className="card mt-6 p-8 text-center text-sm text-muted">The SAP keying sheet becomes available once the vendor is approved.</div>;
  const rows = sheet.data?.rows ?? [];
  const copyAll = async () => { try { await navigator.clipboard.writeText(rows.map(([k, v]) => `${k}\t${v}`).join('\n')); setCopied(true); toast('SAP sheet copied.'); setTimeout(() => setCopied(false), 2000); } catch { toast('Copy failed.', 'warn'); } };
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-greige px-5 py-3">
          <div><div className="eyebrow">SAP keying sheet</div><div className="text-xs text-muted">Fields in SAP entry order.</div></div>
          <div className="flex gap-2"><button className="btn-secondary !py-1.5 text-xs" onClick={copyAll}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy all'}</button><button className="btn-secondary !py-1.5 text-xs" onClick={() => downloadSapSheet(vendor.id, vendor.name).catch(() => toast('Download failed.', 'warn'))}><Download size={14} /> Download CSV</button></div>
        </div>
        {sheet.isLoading ? <Skeleton className="m-4 h-64" /> : <table className="w-full text-sm"><tbody>{rows.map(([k, v]) => <tr key={k} className="border-t border-greige first:border-0"><td className="w-56 px-5 py-2 text-xs text-muted">{k}</td><td className="px-5 py-2 font-mono text-[13px] text-ink">{v}</td></tr>)}</tbody></table>}
      </div>
      <div className="card h-fit p-5">
        <div className="eyebrow">Vendor code issued</div>
        <p className="mt-1 text-xs text-muted">Once the vendor is keyed into SAP, enter the code here. The vendor is notified and the record is closed.</p>
        {vendor.status === 'code_issued' ? <div className="mt-4 rounded-xl bg-pass-bg p-4 text-sm text-pass"><Check size={14} className="me-1 inline" /> Vendor code <span className="font-mono font-semibold">{vendor.vendorCode}</span> issued {fmtDate(vendor.codeIssuedAt)}.</div> : canIssue ? (
          <div className="mt-4 flex gap-2"><input className="input font-mono" placeholder="e.g. 400116" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Vendor code" /><button className="btn-primary shrink-0" disabled={code.trim().length < 4 || issue.isPending} onClick={() => issue.mutate(code.trim(), { onSuccess: () => toast(`Vendor code ${code.trim()} issued.`) })}><KeyRound size={14} /> Issue</button></div>
        ) : <p className="mt-4 text-sm text-muted">An approver issues the code.</p>}
        <ErrorBox error={issue.error} className="mt-3" />
        <div className="mt-5 border-t border-greige pt-4 text-xs text-muted">Approved by {vendor.approvedBy}. Invited by {vendor.invitedBy}.{vendor.callbackConfirmedBy ? ` Bank details confirmed by call-back (${vendor.callbackConfirmedBy}).` : ''}</div>
      </div>
    </div>
  );
}

const KIND: Record<AuditEntry['kind'], { Icon: typeof Upload; label: string; cls: string }> = {
  upload: { Icon: Upload, label: 'Upload', cls: 'bg-teal/10 text-teal' }, ai: { Icon: Sparkles, label: 'AI result', cls: 'bg-cream text-gold-deep' }, rule: { Icon: Scale, label: 'Rule', cls: 'bg-greige text-body' },
  registry: { Icon: Landmark, label: 'Registry', cls: 'bg-greige text-body' }, review: { Icon: UserRound, label: 'Reviewer', cls: 'bg-pass-bg text-pass' }, system: { Icon: Cog, label: 'System', cls: 'bg-greige text-muted' }, email: { Icon: Mail, label: 'Email', cls: 'bg-greige text-muted' },
};

function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  const sorted = [...entries].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <div className="card mt-6 p-5">
      <div className="eyebrow">Audit trail</div>
      <ol className="mt-4">
        {sorted.map((e) => { const k = KIND[e.kind] ?? KIND.system; return (
          <li key={e.id} className="flex gap-4 border-t border-greige py-3 first:border-0">
            <div className="w-28 shrink-0 text-xs text-muted">{fmtDateTime(e.at)}</div>
            <span className={`chip shrink-0 ${k.cls}`}><k.Icon size={12} /> {k.label}</span>
            <div className="min-w-0 flex-1"><div className="text-sm text-ink">{e.message}</div>{e.detail && <div className="text-xs text-muted">{e.detail}</div>}</div>
            <div className="shrink-0 text-xs text-body">{e.actor}</div>
          </li>
        ); })}
        {sorted.length === 0 && <li className="py-6 text-center text-sm text-muted">Nothing logged yet.</li>}
      </ol>
    </div>
  );
}
