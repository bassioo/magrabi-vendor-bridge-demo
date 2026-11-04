import { X, FileText } from 'lucide-react';
import type { DocumentRecord } from '@vendorhub/shared';
import { fileUrl } from '@/api/client';

export function DocPreview({ doc, token, onClose }: { doc: DocumentRecord; token?: string; onClose: () => void }) {
  const url = fileUrl(doc.id, token);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-4" onClick={onClose}>
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-2 shadow-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 text-ink shadow" onClick={onClose} aria-label="Close preview"><X size={16} /></button>
        {doc.mimeType === 'application/pdf' ? (
          <object data={url} type="application/pdf" className="h-[85vh] w-full rounded-xl" aria-label={doc.fileName}>
            <a href={url} target="_blank" rel="noreferrer" className="flex h-40 flex-col items-center justify-center text-sm text-teal underline"><FileText size={28} /> Open PDF</a>
          </object>
        ) : (
          <img src={url} alt={doc.fileName} className="mx-auto max-h-[85vh] w-auto rounded-xl" />
        )}
        <div className="px-3 py-2 text-xs text-muted">{doc.fileName}</div>
      </div>
    </div>
  );
}
