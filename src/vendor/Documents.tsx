import { useRef, useState } from 'react';
import { UploadCloud, RefreshCw, FileText } from 'lucide-react';
import { DocPreview } from '@/components/DocPreview';
import { assetUrl } from '@/lib/format';
import type { Vendor, UploadedDoc } from '@/lib/types';
import { useStore } from '@/app/store';
import { useLang, pick } from '@/lib/i18n';
import { CHECKLISTS, type ChecklistItem } from '@/data/checklists';
import { Headline } from '@/components/Headline';
import { ProgressBar } from '@/components/Stepper';
import { CheckRow } from '@/components/CheckRow';
import { LevelChip } from '@/components/StatusChip';
import { defaultSampleKey, extractDocument, pickerOptions, resolveSampleKey, vendorKeyFor, AI_MODEL_LABEL, checkReason, SAMPLE_DOCS } from '@/lib/mockAi';
import { liveExtract, LIVE_AI_ENABLED, LIVE_AI_MODEL } from '@/lib/liveAi';

function Slot({ vendor, slot }: { vendor: Vendor; slot: ChecklistItem }) {
  const { t, lang } = useLang();
  const store = useStore();
  const vendorKey = vendorKeyFor(vendor.country, vendor);
  const doc: UploadedDoc | undefined = vendor.documents[slot.id];
  const [picked, setPicked] = useState(doc?.sampleKey ?? defaultSampleKey(vendorKey, slot.id));
  const [reading, setReading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const options = pickerOptions(vendorKey, slot);

  const upload = async (fileName: string) => {
    setReading(true);
    const recognised = resolveSampleKey(fileName);
    const key = recognised ?? picked;
    if (recognised) setPicked(recognised);
    store.audit(vendor.id, 'Vendor', 'upload', `${doc ? 'Replaced' : 'Uploaded'} ${slot.label.toLowerCase()} · ${fileName}${recognised ? ` · recognised as "${SAMPLE_DOCS[recognised].title}"` : ''}`);
    const result = await extractDocument(slot, key, fileName, vendor);
    const live = LIVE_AI_ENABLED ? await liveExtract(result.image, slot.docType) : null;
    if (live) result.extracted = live;
    store.update(vendor.id, (v) => ({ ...v, documents: { ...v.documents, [slot.id]: result } }));
    const fields = Object.keys(result.extracted).join(', ') || 'no fields';
    store.audit(vendor.id, 'System', 'ai', `${live ? `Live extraction (${LIVE_AI_MODEL})` : AI_MODEL_LABEL}: read ${slot.label.toLowerCase()} · ${fields}`);
    const failed = result.checks.filter((c) => c.level === 'fail');
    if (failed.length) store.audit(vendor.id, 'System', 'rule', `${slot.label} FAILED ${failed.length === 1 ? 'a check' : `${failed.length} checks`} · vendor told instantly`, failed.map((c) => c.reason).join(' '));
    else store.audit(vendor.id, 'System', 'rule', `${slot.label} passed all ${result.checks.length} checks`);
    setReading(false);
  };

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    void upload(f ? f.name : `${slot.id}.pdf`);
  };

  return (
    <div className={`card p-5 ${doc?.level === 'fail' ? 'ring-1 ring-fail/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink">{pick(lang, slot.label, slot.labelAr)}</div>
          {slot.hint && <div className="text-xs text-muted">{pick(lang, slot.hint, slot.hintAr ?? '')}</div>}
        </div>
        {doc && !reading && <LevelChip level={doc.level} label={doc.level === 'pass' ? t('common.pass') : doc.level === 'fail' ? t('common.fail') : t('common.flag')} />}
      </div>

      {reading ? (
        <div className="mt-4 rounded-xl p-4">
          <div className="shimmer h-20 rounded-lg" />
          <div className="mt-2 text-center text-xs text-muted">{t('documents.reading')}</div>
        </div>
      ) : doc ? (
        <div className="mt-4">
          <div className="flex items-center gap-3 rounded-xl bg-greige/70 p-3">
            <button type="button" onClick={() => setPreview(true)} aria-label="Preview document"><img src={assetUrl(doc.image)} alt="" className="h-16 w-12 cursor-zoom-in rounded object-cover object-top shadow-soft" /></button>
            {preview && <DocPreview doc={doc} onClose={() => setPreview(false)} />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate text-sm text-ink"><FileText size={14} className="shrink-0 text-muted" /> {doc.fileName}</div>
              <div className="text-xs text-muted">{t('documents.uploaded')}</div>
            </div>
            <button className="btn-ghost text-xs" onClick={() => fileRef.current?.click()}><RefreshCw size={13} /> {t('documents.replace')}</button>
          </div>
          <div className="mt-2 divide-y divide-greige">
            {doc.checks.map((c) => (
              <CheckRow key={c.id} level={c.level} label={pick(lang, c.label, c.labelAr)} reason={checkReason(c, lang)} word={c.level === 'pass' ? t('common.pass') : c.level === 'fail' ? t('common.fail') : c.level === 'flag' ? t('common.flag') : t('common.pending')} />
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
          className={`mt-4 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-sm transition ${drag ? 'border-teal bg-teal/5' : 'border-champagne/70 text-body hover:border-teal hover:bg-teal/5'}`}
        >
          <UploadCloud className="mb-2 text-teal" />
          {t('documents.drop')}
        </button>
      )}
      <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />

      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
        <span>{t('documents.demoPicker')}:</span>
        <select value={picked} onChange={(e) => setPicked(e.target.value)} className="rounded border border-champagne/50 bg-white px-1.5 py-0.5 text-[11px] text-body" aria-label={`Demo picker for ${slot.label}`}>
          {options.map((o) => <option key={o.key} value={o.key}>{pick(lang, o.label, o.labelAr)}</option>)}
        </select>
      </div>
    </div>
  );
}

export function Documents({ vendor }: { vendor: Vendor }) {
  const { t, lang } = useLang();
  const store = useStore();
  const slots = CHECKLISTS[vendor.country];
  const uploaded = slots.filter((s) => vendor.documents[s.id]);
  const failed = uploaded.filter((s) => vendor.documents[s.id].level === 'fail');
  const missing = slots.length - uploaded.length;
  const ready = missing === 0 && failed.length === 0;
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-2 flex items-center justify-between text-xs text-muted"><span>{t('documents.eyebrow')}</span><span>{uploaded.length} / {slots.length}</span></div>
      <ProgressBar value={66 + (uploaded.length / slots.length) * 17} className="mb-8" />
      <Headline eyebrow={t('documents.eyebrow')} text={t('documents.title')} accent={t('documents.titleAccent')} size="md" />
      <p className="mt-3 max-w-2xl text-sm text-body">{t('documents.intro')}</p>
      <p className="mt-1 max-w-2xl text-xs text-muted">{pick(lang, 'Demo: files from the sample documents folder are recognised by name. Any other file uses the demo picker under the slot.', 'للعرض: الملفات من مجلد المستندات النموذجية يتم التعرّف عليها بالاسم. أي ملف آخر يستخدم الاختيار التجريبي أسفل الخانة.')}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {slots.map((slot) => <Slot key={slot.id} vendor={vendor} slot={slot} />)}
      </div>
      <div className="sticky bottom-4 mt-8 flex flex-wrap items-center gap-3 rounded-card border border-champagne/50 bg-white/95 p-4 shadow-card backdrop-blur">
        <div className={`text-sm ${ready ? 'text-pass' : failed.length ? 'text-fail' : 'text-muted'}`}>
          {ready ? t('documents.allGood') : failed.length ? t('documents.fixFirst') : t('documents.missing', { n: missing })}
        </div>
        <div className="ms-auto flex gap-2">
          <button className="btn-ghost" onClick={() => store.update(vendor.id, (v) => ({ ...v, stage: 'form' }))}>{t('common.back')}</button>
          <button className="btn-teal" disabled={!ready} onClick={() => store.update(vendor.id, (v) => ({ ...v, stage: 'review' }))}>{t('documents.continue')}</button>
        </div>
      </div>
    </div>
  );
}
