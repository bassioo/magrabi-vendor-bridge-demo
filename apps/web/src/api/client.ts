/** Thin fetch wrapper for the Vendor Hub API. Cookies carry the staff session; vendor routes carry the token in the path. */
export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  /** Extra top-level data the API attached to the error body (e.g. `mode` on an unauthenticated /auth/me). */
  extra: Record<string, unknown>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>, extra: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.extra = extra;
  }
}

export type OnUnauthorized = () => void;
let onUnauthorized: OnUnauthorized | null = null;
export function setUnauthorizedHandler(fn: OnUnauthorized | null) {
  onUnauthorized = fn;
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function api<T>(path: string, init: RequestInit & { staff?: boolean } = {}): Promise<T> {
  const { staff = path.startsWith('/staff') || path.startsWith('/auth/me'), ...rest } = init;
  const headers: Record<string, string> = { Accept: 'application/json', ...(rest.headers as Record<string, string>) };
  if (rest.body && !(rest.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, { credentials: 'include', ...rest, headers });
  if (res.status === 401 && staff) onUnauthorized?.();
  if (!res.ok) {
    const body = (await parse(res)) as ({ error?: { code?: string; message?: string; fields?: Record<string, string> } } & Record<string, unknown>) | null;
    const e = body?.error;
    const { error: _ignored, ...extra } = body ?? {};
    throw new ApiError(res.status, e?.code ?? `http_${res.status}`, e?.message ?? res.statusText ?? 'Request failed', e?.fields, extra);
  }
  return (await parse(res)) as T;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
export const patch = <T>(path: string, body?: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) });
export const put = <T>(path: string, body?: unknown) => api<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) });
export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });
export const upload = <T>(path: string, file: File, field = 'file') => {
  const fd = new FormData();
  fd.append(field, file, file.name);
  return api<T>(path, { method: 'POST', body: fd });
};

/** Triggers a browser download of an API resource that returns a file (CSV). */
export async function download(path: string, fileName: string): Promise<void> {
  const res = await fetch(`/api${path}`, { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, `http_${res.status}`, 'Download failed');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const fileUrl = (documentId: string, vendorToken?: string) => `/files/${documentId}${vendorToken ? `?t=${encodeURIComponent(vendorToken)}` : ''}`;
