export const nowIso = (): string => new Date().toISOString();
export function addDays(iso: string, days: number): string { const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString(); }
export function addMinutes(iso: string, m: number): string { return new Date(new Date(iso).getTime() + m * 60_000).toISOString(); }
export function daysAgo(n: number, hours = 0): string { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(d.getHours() - hours); return d.toISOString(); }
export function monthsAgo(n: number): string { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString(); }
export function daysBetween(a?: string | null, b?: string | null): number | null { if (!a || !b) return null; return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000); }
