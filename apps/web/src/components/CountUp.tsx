import { useEffect, useRef, useState } from 'react';

/** Animates a number from 0 to its value once, respecting reduced-motion. */
export function CountUp({ value, decimals = 0, suffix = '', className = '' }: { value: number; decimals?: number; suffix?: string; className?: string }) {
  const [n, setN] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) { setN(value); return; }
    started.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(value); return; }
    const t0 = performance.now();
    const dur = 700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>{n.toFixed(decimals)}{suffix}</span>;
}
