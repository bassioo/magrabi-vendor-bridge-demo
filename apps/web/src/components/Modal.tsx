import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, eyebrow, onClose, children, wide = false, footer }: { title: ReactNode; eyebrow?: string; onClose: () => void; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 p-4" onClick={onClose}>
      <div className={`card flex max-h-[92vh] w-full flex-col p-6 ${wide ? 'max-w-4xl' : 'max-w-lg'}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 className="text-2xl">{title}</h2>
          </div>
          <button className="btn-ghost -mr-2 -mt-2 p-1" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-auto">{children}</div>
        {footer && <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-greige pt-4">{footer}</div>}
      </div>
    </div>
  );
}
