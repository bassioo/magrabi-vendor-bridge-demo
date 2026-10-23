import { LensMark } from './LensMark';

/** MAGRABi wordmark + product name. Never CSS-uppercase the name: the lowercase i is part of the brand. */
export function Brand({ product = 'Vendor Management', size = 30, compact = false }: { product?: string; size?: number; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LensMark size={size} />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight text-ink">MAGRABi</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-deep">{product}</span>
        </span>
      )}
    </span>
  );
}
