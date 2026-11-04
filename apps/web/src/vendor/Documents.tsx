import { useRef, useState } from 'react';
import { UploadCloud, RefreshCw, FileText, Trash2, Loader2 } from 'lucide-react';
import { useLang, pick } from '@/lib/i18n';
import { Headline } from '@/components/Headline';
import { ProgressBar } from '@/components/Stepper';
import { CheckRow } from '@/components/CheckRow';
import { LevelChip } from '@/components/StatusChip';
import { DocPreview } from '@/components/DocPreview';
import { ErrorBox } from '@/components/ErrorBox';
import { useDeleteDocument, useUploadDocument } from '@/api/hooks';
import type { ChecklistItem, DocumentRecord } from '@vendorhub/shared';
import type { PortalCtx } from './VendorApp';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';
const MAX = 10 * 1024 * 1024;

function Slot({ ctx, slot, doc }: { ctx: PortalCtx; slot: ChecklistItem; doc?: DocumentRecord }) {
  const { t, lang } = useLang();
  const upload = useUploadDocument(ctx.token);
  const remove = useDeleteDocument(ctx.token);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState(false);
  const [localErr, setLocalErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setLocalErr('');
    if (f.size > MAX) { setLocalErr(t('documents.tooLarge')); return; }
    if (!/pdf|png|jpe?g/i.test(f.type) && !/\.(pdf|png|jpe?g)$/i.test(f.name)) { setLocalErr(t('documents.badType')); return; }
    upload.mutate({ slotId: slot.id, file: f });
  };
  const reading = upload.isPending;
  return (
    <div className={`card p-5 ${doc?.level === 'fail' ? 'ring-1 ring-fail/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div><div className="text-sm font-semibold text-ink">{pick(lang, slot.label, slot.labelAr)}</div>{slot.hint && <div className="text-xs text-muted">{pick(lang, slot.hint, slot.hintAr ?? '')}</div>}</div>
        {doc && !reading && <LevelChip level={doc.level} label={doc.level === 'pass' ? t('common.pass') : doc.level === 'fail' ? t('common.fail') : t('common.flag')} />}
      </div>
      {reading ? (
        <div className="mt-4 rounded-xl p-4"><div className="shimmer h-20 rounded-lg" /><div className="mt-2 flex items-center justify-center gap-2 text-center text-xs text-muted"><Loader2 size={12} className="animate-spin" /> {t('documents.reading')}</div></div>
      ) : doc ? (
        <div className="mt-4">
          <div className="flex items-center gap-3 rounded-xl bg-greige/70 p-3">
            <button type="button" onClick={() => setPreview(true)} aria-label={t('documents.preview')} className="flex h-16 w-12 items-center justify-center rounded bg-white shadow-soft"><FileText size={20} className="text-muted" /></button>
            <div className="min-w-0 flex-1"><div className="truncate text-sm text-ink">{doc.fileName}</div><div className="text-xs text-muted">{t('documents.uploaded')} · {(doc.sizeBytes / 1024).toFixed(0)} KB</div></div>
            <button className="btn-ghost text-xs" onClick={() => fileRef.current?.click()}><RefreshCw size={13} /> {t('documents.replace')}</button>
            <button className="btn-ghost text-xs text-fail" onClick={() => remove.mutate(slot.id)} aria-label={t('documents.delete')}><Trash2 size={13} /></button>
          </div>
          <div className="mt-2 divide-y divide-greige">{doc.checks.map((c) => <CheckRow key={c.id} level={c.level} label={pick(lang, c.label, c.labelAr)} reason={pick(lang, c.reason, c.reasonAr)} word={c.level === 'pass' ? t('common.pass') : c.level === 'fail' ? t('common.fail') : c.level === 'flag' ? t('common.flag') : t('common.pending')} />)}</div>
          {preview && <DocPreview doc={doc} token={ctx.token} onClose={() => setPreview(false)} />}
        </div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }} className={`mt-4 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-sm transition ${drag ? 'border-teal bg-teal/5' : 'border-champagne/70 text-body hover:border-teal hover:bg-teal/5'}`}>
          <UploadCloud className="mb-2 text-teal" />{t('documents.drop')}<span className="mt-1 text-[11px] text-muted">{t('documents.formats')}</span>
        </button>
      )}
      <input ref={fileRef} type="file" className="hidden" accept={ACCEPT} onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
      {localErr && <div className="mt-2 text-xs text-fail">{localErr}</div>}
      <ErrorBox error={upload.error ?? remove.error} className="mt-2" />
    </div>
  );
}

export function Documents({ ctx }: { ctx: PortalCtx }) {
  const { t } = useLang();
  const { vendor, profile } = ctx.portal;
  const slots = profile.checklist;
  const docs = vendor.documents ?? [];
  const uploaded = slots.filter((s) => docs.some((d) => d.slotId === s.id));
  const failed = uploaded.filter((s) => docs.find((d) => d.slotId === s.id)?.level === 'fail');
  const missing = slots.length - uploaded.length;
  const ready = missing === 0 && failed.length === 0;
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-2 flex items-center justify-between text-xs text-muted"><span>{t('documents.eyebrow')}</span><span>{uploaded.length} / {slots.length}</span></div>
      <ProgressBar value={66 + (uploaded.length / slots.length) * 17} className="mb-8" />
      <Headline eyebrow={t('documents.eyebrow')} text={t('documents.title')} accent={t('documents.titleAccent')} size="md" />
      <p className="mt-3 max-w-2xl text-sm text-body">{t('documents.intro')}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">{slots.map((slot) => <Slot key={slot.id} ctx={ctx} slot={slot} doc={docs.find((d) => d.slotId === slot.id)} />)}</div>
      <div className="sticky bottom-4 mt-8 flex flex-wrap items-center gap-3 rounded-card border border-champagne/50 bg-white/95 p-4 shadow-card backdrop-blur">
        <div className={`text-sm ${ready ? 'text-pass' : failed.length ? 'text-fail' : 'text-muted'}`}>{ready ? t('documents.allGood') : failed.length ? t('documents.fixFirst') : t('documents.missing', { n: missing })}</div>
        <div className="ms-auto flex gap-2"><button className="btn-ghost" onClick={() => void ctx.save({ stage: 'form' })}>{t('common.back')}</button><button className="btn-teal" disabled={!ready} onClick={() => void ctx.save({ stage: 'review' })}>{t('documents.continue')}</button></div>
      </div>
    </div>
  );
}
