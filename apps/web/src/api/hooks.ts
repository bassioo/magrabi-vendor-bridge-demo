import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuditEntry, CheckLevel, Country, CountryProfile, DocumentRecord, DuplicateMatch, Email, Lang, RegistryCheck, ReviewSummary, SapVendor, Settings, User, Vendor, IbanResult } from '@vendorhub/shared';
import { del, download, get, patch, post, put, upload } from './client';

// ---------- shapes ----------
export type Mode = 'demo' | 'live';
export interface Me { user: User; mode: Mode; settings: Settings }
export interface VendorListRow extends Vendor { summary: { text: string; level: CheckLevel }; overdueDays?: number }
export interface Dashboard {
  kpis: { inQueue: number; newCount: number; inReview: number; avgDaysToCode: number | null; firstTimeRightPct: number | null; returnedThisMonth: number; overdue: number };
  stages: { stage: string; days: number }[];
  byCountry: { country: Country; n: number }[];
  attention: VendorListRow[];
  activity: (AuditEntry & { vendorName: string })[];
}
export interface VendorDetail { vendor: Vendor; summary: ReviewSummary; sapMatch?: DuplicateMatch; inviteLink: string }
export interface VendorPortal { vendor: Vendor; profile: CountryProfile; settings: { bankLetterMaxMonths: number }; mode: Mode }
export interface LookupResult { found: boolean; registry: string; provider: string; company?: Partial<Vendor['company']> }
export interface ValidateResult { iban?: IbanResult; vat?: { ok: boolean; message: string; messageAr: string; optional: boolean } }
export interface ReturnDraft { en: string; ar: string; items: string[] }

export const keys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  vendors: (p: Record<string, string>) => ['vendors', p] as const,
  vendor: (id: string) => ['vendor', id] as const,
  sap: (q: string) => ['sap', q] as const,
  emails: (vendorId?: string) => ['emails', vendorId ?? ''] as const,
  users: ['users'] as const,
  settings: ['settings'] as const,
  countries: ['countries'] as const,
  notifications: ['notifications'] as const,
  portal: (token: string) => ['portal', token] as const,
};

// ---------- auth ----------
export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => get<Me>('/auth/me'), retry: false, staleTime: 60_000 });
export const useRequestLink = () => useMutation({ mutationFn: (email: string) => post<{ ok: true }>('/auth/request-link', { email }) });
export const useDemoLogin = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (email: string) => post<{ user: User }>('/auth/demo-login', { email }), onSuccess: () => qc.invalidateQueries() });
};
export const useLogout = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => post<{ ok: true }>('/auth/logout'), onSuccess: () => qc.clear() });
};

// ---------- staff ----------
export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: () => get<Dashboard>('/staff/dashboard') });
export const useVendors = (p: { status?: string; country?: string; q?: string; sort?: string }) => {
  const params = Object.fromEntries(Object.entries(p).filter(([, v]) => v)) as Record<string, string>;
  const qs = new URLSearchParams(params).toString();
  return useQuery({ queryKey: keys.vendors(params), queryFn: () => get<{ rows: VendorListRow[] }>(`/staff/vendors${qs ? `?${qs}` : ''}`) });
};
export const useVendor = (id: string) => useQuery({ queryKey: keys.vendor(id), queryFn: () => get<VendorDetail>(`/staff/vendors/${id}`), enabled: !!id });

function useVendorMutation<TArgs, TOut>(fn: (args: TArgs) => Promise<TOut>, vendorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (vendorId) qc.invalidateQueries({ queryKey: keys.vendor(vendorId) });
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: keys.dashboard });
      qc.invalidateQueries({ queryKey: keys.notifications });
      qc.invalidateQueries({ queryKey: ['emails'] });
      qc.invalidateQueries({ queryKey: ['sap'] });
    },
  });
}

export const useInvite = () => useVendorMutation((b: { email: string; country: Country; category: string; lang?: Lang }) => post<{ vendor: Vendor; link: string }>('/staff/vendors/invite', b));
export const useAssign = (id: string) => useVendorMutation((b: { userId?: string }) => post<{ vendor: Vendor }>(`/staff/vendors/${id}/assign`, b), id);
export const useAddNote = (id: string) => useVendorMutation((text: string) => post<{ note: unknown }>(`/staff/vendors/${id}/notes`, { text }), id);
export const useCallback_ = (id: string) => useVendorMutation((b: { confirmed: true; phone: string }) => post<{ vendor: Vendor }>(`/staff/vendors/${id}/callback`, b), id);
export const useApprove = (id: string) => useVendorMutation(() => post<{ vendor: Vendor }>(`/staff/vendors/${id}/approve`, {}), id);
export const useReturn = (id: string) => useVendorMutation((b: ReturnDraft) => post<{ vendor: Vendor }>(`/staff/vendors/${id}/return`, b), id);
export const useReject = (id: string) => useVendorMutation((reason: string) => post<{ vendor: Vendor }>(`/staff/vendors/${id}/reject`, { reason }), id);
export const useReturnDraft = (id: string, enabled: boolean) => useQuery({ queryKey: ['return-draft', id], queryFn: () => get<ReturnDraft>(`/staff/vendors/${id}/return-draft`), enabled, staleTime: 0 });
export const useSapSheet = (id: string, enabled: boolean) => useQuery({ queryKey: ['sap-sheet', id], queryFn: () => get<{ rows: [string, string][] }>(`/staff/vendors/${id}/sap-sheet?format=json`), enabled });
export const downloadSapSheet = (id: string, name: string) => download(`/staff/vendors/${id}/sap-sheet?format=csv`, `sap-keying-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`);
export const useIssueCode = (id: string) => useVendorMutation((code: string) => post<{ vendor: Vendor }>(`/staff/vendors/${id}/issue-code`, { code }), id);
export const useResendInvite = (id: string) => useVendorMutation(() => post<{ link: string }>(`/staff/vendors/${id}/resend-invite`, {}), id);
export const useRecheck = (id: string) => useVendorMutation(() => post<{ registryChecks: RegistryCheck[] }>(`/staff/vendors/${id}/recheck`, {}), id);

export const useSapVendors = (q: string) => useQuery({ queryKey: keys.sap(q), queryFn: () => get<{ rows: SapVendor[] }>(`/staff/sap-vendors${q ? `?q=${encodeURIComponent(q)}` : ''}`) });
export const useSapImport = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (file: File) => upload<{ imported: number; skipped: number }>('/staff/sap-vendors/import', file), onSuccess: () => qc.invalidateQueries({ queryKey: ['sap'] }) });
};
export const useEmails = (vendorId?: string) => useQuery({ queryKey: keys.emails(vendorId), queryFn: () => get<{ rows: Email[] }>(`/staff/emails${vendorId ? `?vendorId=${vendorId}` : ''}`) });
export const useUsers = (enabled = true) => useQuery({ queryKey: keys.users, queryFn: () => get<{ rows: User[] }>('/staff/users'), enabled });
export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (b: { email: string; name: string; role: User['role']; markets: User['markets'] }) => post<{ user: User }>('/staff/users', b), onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }) });
};
export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...b }: { id: string; name?: string; role?: User['role']; markets?: User['markets']; active?: boolean }) => patch<{ user: User }>(`/staff/users/${id}`, b), onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }) });
};
export const useSettings = () => useQuery({ queryKey: keys.settings, queryFn: () => get<{ settings: Settings }>('/staff/settings') });
export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (b: Partial<Settings>) => patch<{ settings: Settings }>('/staff/settings', b), onSuccess: () => { qc.invalidateQueries({ queryKey: keys.settings }); qc.invalidateQueries({ queryKey: keys.me }); } });
};
export const useCountries = () => useQuery({ queryKey: keys.countries, queryFn: () => get<{ rows: CountryProfile[] }>('/staff/countries') });
export const useSaveCountry = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (p: CountryProfile) => put<{ profile: CountryProfile }>(`/staff/countries/${p.code}`, p), onSuccess: () => qc.invalidateQueries({ queryKey: keys.countries }) });
};
export const exportQueue = (status: string) => download(`/staff/reports/export?status=${encodeURIComponent(status)}`, `vendor-queue-${status}.csv`);
export const useNotifications = () => useQuery({ queryKey: keys.notifications, queryFn: () => get<{ rows: (AuditEntry & { vendorName: string })[]; unread: number }>('/staff/notifications'), refetchInterval: 60_000 });
export const useMarkSeen = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => post<{ ok: true }>('/staff/notifications/seen'), onSuccess: () => qc.invalidateQueries({ queryKey: keys.notifications }) });
};
export const useDemoReset = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => get<{ ok: true }>('/staff/demo/reset'), onSuccess: () => qc.invalidateQueries() });
};

// ---------- vendor portal ----------
export const usePortal = (token: string) => useQuery({ queryKey: keys.portal(token), queryFn: () => get<VendorPortal>(`/v/${token}`), enabled: !!token, retry: false, staleTime: 5_000 });
export const useSavePortal = (token: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: Partial<Pick<Vendor, 'lang' | 'stage' | 'formStep' | 'company' | 'tax' | 'bank' | 'contacts'>>) => patch<{ vendor: Vendor }>(`/v/${token}`, b),
    onSuccess: (data) => qc.setQueryData<VendorPortal>(keys.portal(token), (old) => (old ? { ...old, vendor: { ...old.vendor, ...data.vendor, documents: data.vendor.documents ?? old.vendor.documents } } : old)),
  });
};
export const useLookup = (token: string) => useMutation({ mutationFn: (regNumber: string) => post<LookupResult>(`/v/${token}/lookup`, { regNumber }) });
export const useValidate = (token: string) => useMutation({ mutationFn: (b: { iban?: string; vatNumber?: string }) => post<ValidateResult>(`/v/${token}/validate`, b) });
export const useUploadDocument = (token: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ slotId, file }: { slotId: string; file: File }) => upload<{ document: DocumentRecord }>(`/v/${token}/documents/${slotId}`, file), onSuccess: () => qc.invalidateQueries({ queryKey: keys.portal(token) }) });
};
export const useDeleteDocument = (token: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (slotId: string) => del<{ ok: true }>(`/v/${token}/documents/${slotId}`), onSuccess: () => qc.invalidateQueries({ queryKey: keys.portal(token) }) });
};
export const useSubmit = (token: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => post<{ vendor: Vendor }>(`/v/${token}/submit`, { confirm: true }), onSuccess: () => qc.invalidateQueries({ queryKey: keys.portal(token) }) });
};
