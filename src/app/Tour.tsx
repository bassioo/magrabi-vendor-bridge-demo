import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { TOUR_STEPS } from './tourSteps';
import { useStore } from './store';
import { LensMark } from '@/components/LensMark';

interface TourApi {
  active: boolean;
  step: number;
  start: () => void;
  stop: () => void;
}

const TourContext = createContext<TourApi>({ active: false, step: 0, start: () => {}, stop: () => {} });

export function useTour() {
  return useContext(TourContext);
}

interface Rect { top: number; left: number; width: number; height: number }

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const store = useStore();
  const raf = useRef<number | null>(null);

  const current = TOUR_STEPS[step];

  const stop = useCallback(() => {
    setActive(false);
    setRect(null);
    store.setFlags({ tourDone: true });
  }, [store]);

  const start = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  // Navigate to the step's route when it changes; drop the previous spotlight so a slow page never shows a stale ring
  useEffect(() => {
    if (!active || !current) return;
    if (location.pathname !== current.path) navigate(current.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step]);

  // Find and measure the target (poll briefly: the page may still be rendering)
  useLayoutEffect(() => {
    if (!active || !current) return;
    setRect(null); // never show the previous step's ring while this one is still rendering
    let tries = 0;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
      if (el && location.pathname === current.path) {
        el.scrollIntoView({ block: 'center', behavior: tries === 0 ? 'auto' : 'smooth' });
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        return;
      }
      if (tries < 40) {
        tries += 1;
        raf.current = window.setTimeout(measure, 60) as unknown as number;
      }
    };
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      cancelled = true;
      if (raf.current) clearTimeout(raf.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [active, step, location.pathname, current]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(TOUR_STEPS.length - 1, s + 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, stop]);

  const api = useMemo<TourApi>(() => ({ active, step, start, stop }), [active, step, start, stop]);
  const last = step === TOUR_STEPS.length - 1;
  const pad = 10;

  // Tooltip placement
  let card: React.CSSProperties = { top: 120, left: 120 };
  if (rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(380, vw - 32);
    const placement = current.placement ?? (rect.top + rect.height + 220 < vh ? 'bottom' : 'top');
    if (placement === 'bottom') card = { top: rect.top + rect.height + pad + 12, left: Math.max(16, Math.min(rect.left, vw - w - 16)), width: w };
    else if (placement === 'top') card = { top: Math.max(16, rect.top - pad - 12 - 200), left: Math.max(16, Math.min(rect.left, vw - w - 16)), width: w };
    else if (placement === 'left') card = { top: Math.max(16, Math.min(rect.top, vh - 240)), left: Math.max(16, rect.left - w - pad - 16), width: w };
    else card = { top: Math.max(16, Math.min(rect.top, vh - 240)), left: Math.min(vw - w - 16, rect.left + rect.width + pad + 16), width: w };
  }

  return (
    <TourContext.Provider value={api}>
      {children}
      {active &&
        createPortal(
          <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Guided tour">
            {rect ? (
              <div data-tour-spotlight className="absolute rounded-2xl ring-2 ring-gold transition-all duration-300" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: '0 0 0 9999px rgba(30,27,24,0.62)' }} />
            ) : (
              <div className="absolute inset-0 bg-espresso/60" />
            )}
            <div className="absolute card tour-card p-5" style={card}>
              <div className="flex items-start gap-3">
                <LensMark size={28} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="eyebrow">Guided tour · {step + 1} of {TOUR_STEPS.length}</div>
                  <h3 className="mt-1 text-xl leading-snug">{current.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-body">{current.body}</p>
                </div>
                <button className="btn-ghost -mr-2 -mt-2 p-1 text-muted" onClick={stop} aria-label="Close tour"><X size={16} /></button>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex gap-1">
                  {TOUR_STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-4 bg-gold' : 'w-1.5 bg-champagne'}`} />)}
                </div>
                <button className="btn-ghost ms-auto text-xs" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft size={14} /> Back</button>
                <button className="btn-primary text-xs" onClick={() => (last ? stop() : setStep((s) => s + 1))}>{last ? 'Finish' : 'Next'} {!last && <ArrowRight size={14} />}</button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </TourContext.Provider>
  );
}
