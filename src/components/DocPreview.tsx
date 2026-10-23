import { X } from 'lucide-react';
import type { UploadedDoc } from '@/lib/types';
import { assetUrl } from '@/lib/format';

export function DocPreview({ doc, onClose }: { doc: UploadedDoc; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-4" onClick={onClose}>
      <div className="relative max-h-[92vh] overflow-auto rounded-2xl bg-white p-2 shadow-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-ink shadow" onClick={onClose} aria-label="Close preview"><X size={16} /></button>
        <img src={assetUrl(doc.image)} alt={doc.fileName} className="max-h-[88vh] w-auto rounded-xl" />
        <div className="px-3 py-2 text-xs text-muted">{doc.fileName} · sample document</div>
      </div>
    </div>
  );
}
