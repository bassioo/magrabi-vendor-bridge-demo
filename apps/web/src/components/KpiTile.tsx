import type { ReactNode } from 'react';

export function KpiTile({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: string; accent?: 'gold' | 'teal' | 'pass' | 'flag' }) {
  const color = accent === 'teal' ? 'text-teal' : accent === 'pass' ? 'text-pass' : accent === 'flag' ? 'text-flag' : 'text-ink';
  return (
    <div className="card p-5">
      <div className="eyebrow">{label}</div>
      <div className={`mt-2 font-serif text-4xl ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
