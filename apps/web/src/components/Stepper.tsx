import { Check } from 'lucide-react';

export function Stepper({ steps, current, className = '' }: { steps: string[]; current: number; className?: string }) {
  return (
    <ol className={`flex items-center gap-2 ${className}`} aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${done ? 'bg-gold text-white' : active ? 'border-2 border-gold text-gold-deep' : 'border border-champagne text-muted'}`}>
              {done ? <Check size={12} /> : i + 1}
            </span>
            <span className={`text-xs ${active ? 'font-semibold text-ink' : done ? 'text-body' : 'text-muted'}`}>{s}</span>
            {i < steps.length - 1 && <span className={`mx-1 h-px w-6 ${done ? 'bg-gold' : 'bg-champagne/60'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-champagne/40 ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
    </div>
  );
}
