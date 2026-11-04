export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className}`} aria-hidden="true" />;
}
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-greige p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-3 py-3">
          <Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /><Skeleton className="ml-auto h-6 w-24" />
        </div>
      ))}
    </div>
  );
}
