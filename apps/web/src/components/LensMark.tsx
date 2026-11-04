export function LensMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" stroke="#A8884C" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="15" stroke="#A8884C" strokeWidth="1.5" opacity="0.8" />
      <circle cx="24" cy="24" r="8.5" stroke="#A8884C" strokeWidth="1.5" opacity="0.6" />
      <circle cx="24" cy="24" r="3" fill="#A8884C" />
    </svg>
  );
}
