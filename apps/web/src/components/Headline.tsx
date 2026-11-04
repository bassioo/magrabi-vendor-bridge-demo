export function Headline({ eyebrow, text, accent, size = 'lg', className = '' }: { eyebrow?: string; text: string; accent: string; size?: 'lg' | 'md' | 'sm'; className?: string }) {
  const sz = size === 'lg' ? 'text-4xl md:text-5xl' : size === 'md' ? 'text-3xl' : 'text-2xl';
  return (
    <div className={className}>
      {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
      <h1 className={`${sz} leading-tight`}>
        {text} <span className="accent">{accent}</span>
      </h1>
    </div>
  );
}
