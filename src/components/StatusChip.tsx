import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, Sparkles, Eye } from 'lucide-react';
import type { CheckLevel, FieldSource } from '@/lib/types';

const LEVEL: Record<CheckLevel, { cls: string; Icon: typeof CheckCircle2; word: string }> = {
  pass: { cls: 'bg-pass-bg text-pass', Icon: CheckCircle2, word: 'Pass' },
  flag: { cls: 'bg-flag-bg text-flag', Icon: AlertTriangle, word: 'Check' },
  fail: { cls: 'bg-fail-bg text-fail', Icon: XCircle, word: 'Fail' },
  pending: { cls: 'bg-greige text-grey', Icon: Clock, word: 'Pending' },
};

export function LevelChip({ level, label, className = '' }: { level: CheckLevel; label?: string; className?: string }) {
  const { cls, Icon, word } = LEVEL[level];
  return (
    <span className={`chip ${cls} ${className}`}>
      <Icon size={12} aria-hidden="true" />
      {label ?? word}
    </span>
  );
}

const SOURCE: Record<FieldSource, { cls: string; Icon: typeof ShieldCheck; label: string }> = {
  official: { cls: 'bg-pass-bg text-pass', Icon: ShieldCheck, label: 'Verified · official source' },
  ai: { cls: 'bg-cream text-gold-deep', Icon: Sparkles, label: 'AI-extracted · consistent' },
  review: { cls: 'bg-flag-bg text-flag', Icon: Eye, label: 'Needs review' },
};

export function SourceChip({ source, label, title }: { source: FieldSource; label?: string; title?: string }) {
  const { cls, Icon, label: def } = SOURCE[source];
  return (
    <span className={`chip ${cls}`} title={title}>
      <Icon size={12} aria-hidden="true" />
      {label ?? def}
    </span>
  );
}

export function SimTag({ text = 'simulated' }: { text?: string }) {
  return (
    <span className="ml-1 rounded border border-champagne/70 px-1 py-px text-[10px] text-muted" title="This integration is mocked for the demo. No real system is called.">
      {text}
    </span>
  );
}
