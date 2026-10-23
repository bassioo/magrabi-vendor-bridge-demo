import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import type { CheckLevel } from '@/lib/types';
import { SimTag } from './StatusChip';

const ICON: Record<CheckLevel, { Icon: typeof CheckCircle2; cls: string; word: string }> = {
  pass: { Icon: CheckCircle2, cls: 'text-pass', word: 'Pass' },
  flag: { Icon: AlertTriangle, cls: 'text-flag', word: 'Check' },
  fail: { Icon: XCircle, cls: 'text-fail', word: 'Fix' },
  pending: { Icon: Loader2, cls: 'text-grey animate-spin', word: 'Running' },
};

export function CheckRow({ level, label, reason, simulated, word, action }: { level: CheckLevel; label: string; reason?: string; simulated?: boolean; word?: string; action?: React.ReactNode }) {
  const { Icon, cls, word: w } = ICON[level];
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={18} className={`mt-0.5 shrink-0 ${cls}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-ink">
          {label}
          {simulated && <SimTag />}
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${cls.replace(' animate-spin', '')}`}>{word ?? w}</span>
        </div>
        {reason && <div className="text-xs leading-relaxed text-body/80">{reason}</div>}
      </div>
      {action}
    </div>
  );
}
