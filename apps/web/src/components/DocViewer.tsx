import { useState } from 'react';
import type { DocumentRecord, ChecklistItem } from '@vendorhub/shared';
import { ImageOff, ZoomIn, ZoomOut, Maximize2, CheckCircle2, AlertTriangle, XCircle, FileText } from 'lucide-react';
import { fileUrl } from '@/api/client';

const ICON = { pass: CheckCircle2, flag: AlertTriangle, fail: XCircle, pending: AlertTriangle };
const COLOR = { pass: 'text-pass', flag: 'text-flag', fail: 'text-fail', pending: 'text-muted' };

function DocImage({ doc, token, className, style, onClick }: { doc: DocumentRecord; token?: string; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  const url = fileUrl(doc.id, token);
  if (doc.mimeType === 'application/pdf') {
    return (
      <object data={url} type="application/pdf" className={className} style={style} aria-label={doc.fileName}>
        <a href={url} target="_blank" rel="noreferrer" className="flex h-40 flex-col items-center justify-center text-xs text-teal underline"><FileText size={24} /> Open PDF</a>
      </object>
    );
  }
  return <img src={url} alt={doc.fileName} className={className} style={style} onClick={onClick} />;
}

/** Vertical filmstrip of documents on the left, the selected page fitted to the screen on the right. */
export function DocViewer({ docs, slots, token }: { docs: DocumentRecord[]; slots: ChecklistItem[]; token?: string }) {
  const ordered = slots.map((s) => ({ slot: s, doc: docs.find((d) => d.slotId === s.id) })).filter((x) => x.doc) as { slot: ChecklistItem; doc: DocumentRecord }[];
  const [active, setActive] = useState(ordered[0]?.slot.id);
  const [zoom, setZoom] = useState(1);
  const cur = ordered.find((x) => x.slot.id === active) ?? ordered[0];
  return (
    <div className="card sticky top-20 flex overflow-hidden" style={{ maxHeight: 'calc(100vh - 6.5rem)' }}>
      <aside className="flex w-28 shrink-0 flex-col gap-1.5 overflow-y-auto border-e border-greige bg-greige/40 p-2" aria-label="Documents">
        {ordered.map(({ slot, doc }) => {
          const I = ICON[doc.level];
          const isPdf = doc.mimeType === 'application/pdf';
          return (
            <button key={slot.id} onClick={() => setActive(slot.id)} className={`rounded-xl p-1.5 text-start transition ${cur?.slot.id === slot.id ? 'bg-white shadow-soft ring-1 ring-gold' : 'hover:bg-white/70'}`} title={slot.label}>
              <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md bg-white">
                {isPdf ? <FileText className="text-muted" /> : <img src={fileUrl(doc.id, token)} alt="" className="h-full w-full object-cover object-top" loading="lazy" />}
                <I size={14} className={`absolute right-1 top-1 rounded-full bg-white ${COLOR[doc.level]}`} />
              </div>
              <div className={`mt-1 line-clamp-2 text-[10px] leading-tight ${cur?.slot.id === slot.id ? 'text-ink' : 'text-body'}`}>{slot.label}</div>
            </button>
          );
        })}
        {ordered.length === 0 && <div className="p-2 text-[10px] text-muted">No documents yet</div>}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-greige px-4 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink">{cur?.slot.label ?? 'Document'}</div>
            <div className="truncate text-[11px] text-muted">{cur?.doc.fileName}{cur ? ` · v${cur.doc.version}` : ''}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted">
            <button className="rounded p-1 hover:bg-greige disabled:opacity-40" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} aria-label="Zoom out" disabled={zoom <= 1}><ZoomOut size={14} /></button>
            <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button className="rounded p-1 hover:bg-greige" onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))} aria-label="Zoom in"><ZoomIn size={14} /></button>
            {cur && <a className="ms-1 rounded p-1 hover:bg-greige" href={fileUrl(cur.doc.id, token)} target="_blank" rel="noreferrer" aria-label="Open full size"><Maximize2 size={14} /></a>}
          </div>
        </div>
        <div className={`flex-1 bg-greige/60 p-3 ${zoom > 1 ? 'overflow-auto' : 'overflow-hidden'}`}>
          {cur ? (
            <DocImage doc={cur.doc} token={token} className="mx-auto block rounded-lg bg-white shadow-soft" style={cur.doc.mimeType === 'application/pdf' ? { width: '100%', height: 'calc(100vh - 12.5rem)' } : zoom > 1 ? { width: `${zoom * 100}%`, maxWidth: 'none' } : { maxHeight: 'calc(100vh - 12.5rem)', width: 'auto', maxWidth: '100%' }} />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-muted"><ImageOff /><span className="mt-2 text-sm">No documents yet</span></div>
          )}
        </div>
      </div>
    </div>
  );
}
