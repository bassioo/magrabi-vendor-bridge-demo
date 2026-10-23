import { Upload, Sparkles, Scale, Landmark, UserRound, Cog } from 'lucide-react';
import type { AuditEntry, Vendor } from '@/lib/types';
import { fmtDateTime } from '@/lib/format';

const KIND: Record<AuditEntry['kind'], { Icon: typeof Upload; label: string; cls: string }> = {
  upload: { Icon: Upload, label: 'Upload', cls: 'bg-teal/10 text-teal' },
  ai: { Icon: Sparkles, label: 'AI result', cls: 'bg-cream text-gold-deep' },
  rule: { Icon: Scale, label: 'Rule', cls: 'bg-greige text-body' },
  registry: { Icon: Landmark, label: 'Registry', cls: 'bg-greige text-body' },
  review: { Icon: UserRound, label: 'Reviewer', cls: 'bg-pass-bg text-pass' },
  system: { Icon: Cog, label: 'System', cls: 'bg-greige text-muted' },
};

export function AuditTrail({ vendor }: { vendor: Vendor }) {
  const entries = [...vendor.audit].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <div className="card mt-6 p-5">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Audit trail</div>
        <div className="text-xs text-muted">Model shown as "Simulated extraction v0" · registries simulated</div>
      </div>
      <ol className="mt-4">
        {entries.map((e) => {
          const k = KIND[e.kind];
          return (
            <li key={e.id} className="flex gap-4 border-t border-greige py-3 first:border-0">
              <div className="w-28 shrink-0 text-xs text-muted">{fmtDateTime(e.at)}</div>
              <span className={`chip shrink-0 ${k.cls}`}><k.Icon size={12} /> {k.label}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-ink">{e.message}</div>
                {e.detail && <div className="text-xs text-muted">{e.detail}</div>}
              </div>
              <div className="shrink-0 text-xs text-body">{e.actor}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
