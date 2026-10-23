export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 8);
}
export function nowIso(): string {
  return new Date().toISOString();
}
export function daysAgo(n: number, hours = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}
export function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}
export function fmtDate(iso?: string, lang: 'en' | 'ar' = 'en'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function daysBetween(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

/** Resolves an app asset path against the build base so it works on hosted previews served from a sub-path. */
export function assetUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return base + (path.startsWith('/') ? path : `/${path}`);
}
