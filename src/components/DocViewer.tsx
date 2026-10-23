import { useState } from 'react';
import type { UploadedDoc } from '@/lib/types';
import type { ChecklistItem } from '@/data/checklists';
import { ImageOff, ZoomIn, ZoomOut, Maximize2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { DocPreview } from './DocPreview';
import { assetUrl } from '@/lib/format';

const ICON = { pass: CheckCircle2, flag: AlertTriangle, fail: XCircle, pending: AlertTriangle };
const COLOR = { pass: 'text-pass', flag: 'text-flag', fail: 'text-fail', pending: 'text-muted' };

/**
 * Document viewer: a vertical filmstrip of every uploaded document on the left, the selected page fitted to the
 * screen on the right. No horizontal tab scrolling and no inner scroll at 100%; zoom in when you need detail.
 */
export function DocViewer({ docs, slots, selected, onSelect }: { docs: Record<string, UploadedDoc>; slots: ChecklistItem[]; selected?: string; onSelect?: (slotId: string) => void }) {
  const ids = slots.filter((s) => docs[s.id]).map((s) => s.id);
  const [internal, setInternal] = useState(ids[0]);
  const [zoom, setZoom] = useState(1);
  const [preview, setPreview] = useState(false);
  const active = selected ?? internal;
  const doc = active ? docs[active] : undefined;
  const slot = slots.find((s) => s.id === active);
  const choose = (id: string) => (onSelect ? onSelect(id) : setInternal(id));

  return (
    <div className="card sticky top-20 flex overflow-hidden" style={{ maxHeight: 'calc(100vh - 6.5rem)' }}>
      <aside className="flex w-28 shrink-0 flex-col gap-1.5 overflow-y-auto border-e border-greige bg-greige/40 p-2" aria-label="Documents">
        {slots.map((s) => {
          const d = docs[s.id];
          if (!d) return null;
          const I = ICON[d.level];
          return (
            <button key={s.id} onClick={() => choose(s.id)} className={`group rounded-xl p-1.5 text-left transition ${active === s.id ? 'bg-white shadow-soft ring-1 ring-gold' : 'hover:bg-white/70'}`} title={s.label}>
              <div className="relative overflow-hidden rounded-md bg-white">
                <img src={assetUrl(d.image)} alt="" className="aspect-[3/4] w-full object-cover object-top" loading="lazy" />
                <I size={14} className={`absolute right-1 top-1 rounded-full bg-white ${COLOR[d.level]}`} />
              </div>
              <div className={`mt-1 line-clamp-2 text-[10px] leading-tight ${active === s.id ? 'text-ink' : 'text-body'}`}>{s.label}</div>
            </button>
          );
        })}
        {ids.length === 0 && <div className="p-2 text-[10px] text-muted">No documents yet</div>}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-greige px-4 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink">{slot?.label ?? 'Document'}</div>
            <div className="truncate text-[11px] text-muted">{doc?.fileName} · sample, watermarked</div>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted">
            <button className="rounded p-1 hover:bg-greige" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} aria-label="Zoom out" disabled={zoom <= 1}><ZoomOut size={14} /></button>
            <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button className="rounded p-1 hover:bg-greige" onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))} aria-label="Zoom in"><ZoomIn size={14} /></button>
            <button className="ms-1 rounded p-1 hover:bg-greige" onClick={() => doc && setPreview(true)} aria-label="Open full size"><Maximize2 size={14} /></button>
          </div>
        </div>
        <div className={`flex-1 bg-greige/60 p-3 ${zoom > 1 ? 'overflow-auto' : 'overflow-hidden'}`}>
          {doc ? (
            <img
              src={assetUrl(doc.image)}
              alt={`${slot?.label ?? doc.fileName} (sample document)`}
              className="mx-auto block cursor-zoom-in rounded-lg bg-white shadow-soft"
              style={zoom > 1 ? { width: `${zoom * 100}%`, maxWidth: 'none' } : { maxHeight: 'calc(100vh - 12.5rem)', width: 'auto', maxWidth: '100%' }}
              onClick={() => setPreview(true)}
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-muted">
              <ImageOff />
              <span className="mt-2 text-sm">No documents yet</span>
            </div>
          )}
        </div>
      </div>
      {doc && preview && <DocPreview doc={doc} onClose={() => setPreview(false)} />}
    </div>
  );
}
