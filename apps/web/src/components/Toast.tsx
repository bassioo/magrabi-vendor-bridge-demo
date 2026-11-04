import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

type ToastKind = 'success' | 'info' | 'warn';
interface Toast { id: number; kind: ToastKind; text: string }

const ToastContext = createContext<(text: string, kind?: ToastKind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, kind, text }]);
    setTimeout(() => setItems((xs) => xs.filter((t) => t.id !== id)), 3200);
  }, []);
  const value = useMemo(() => push, [push]);
  const Icon = { success: CheckCircle2, info: Info, warn: AlertTriangle };
  const cls = { success: 'text-pass', info: 'text-teal', warn: 'text-flag' };
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 end-5 z-[60] flex flex-col gap-2" aria-live="polite">
        {items.map((t) => {
          const I = Icon[t.kind];
          return (
            <div key={t.id} className="pointer-events-auto flex items-center gap-2 rounded-xl border border-champagne/60 bg-white px-3.5 py-2.5 text-sm text-ink shadow-card">
              <I size={16} className={cls[t.kind]} />
              {t.text}
              <button className="ms-2 text-muted hover:text-ink" onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))} aria-label="Dismiss"><X size={14} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
