import { AlertTriangle } from 'lucide-react';
import { ApiError } from '@/api/client';

export function ErrorBox({ error, className = '' }: { error: unknown; className?: string }) {
  if (!error) return null;
  const e = error as Partial<ApiError> & { message?: string };
  return (
    <div className={`flex items-start gap-2 rounded-xl bg-fail-bg p-3 text-sm text-fail ${className}`} role="alert">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <div>
        <div>{e.message ?? 'Something went wrong.'}</div>
        {e.fields && <ul className="mt-1 list-disc ps-4 text-xs">{Object.entries(e.fields).map(([k, v]) => <li key={k}>{v}</li>)}</ul>}
      </div>
    </div>
  );
}
