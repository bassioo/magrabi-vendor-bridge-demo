import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { AppState, AuditEntry, Country, DemoUser, Email, EmailKind, SapVendor, Settings, Vendor } from '@/lib/types';
import { buildSeed } from '@/data/seed';
import { nowIso, uid } from '@/lib/format';

const STORAGE_KEY = 'vendor-bridge-demo:v5';

type Action =
  | { type: 'reset' }
  | { type: 'setUser'; user: DemoUser }
  | { type: 'addVendor'; vendor: Vendor }
  | { type: 'update'; id: string; fn: (v: Vendor) => Vendor }
  | { type: 'addSap'; sap: SapVendor }
  | { type: 'addEmail'; email: Email }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'flags'; patch: Partial<Pick<AppState, 'lastSeenAt' | 'tourDone' | 'welcomeDismissed'>> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'reset':
      return buildSeed();
    case 'setUser':
      return { ...state, currentUser: action.user };
    case 'addVendor':
      return { ...state, vendors: [action.vendor, ...state.vendors] };
    case 'update':
      return { ...state, vendors: state.vendors.map((v) => (v.id === action.id ? action.fn(v) : v)) };
    case 'addSap':
      return { ...state, sapVendors: [...state.sapVendors, action.sap] };
    case 'addEmail':
      return { ...state, emails: [action.email, ...state.emails] };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'flags':
      return { ...state, ...action.patch };
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && Array.isArray(parsed.vendors) && parsed.seededAt && parsed.settings && Array.isArray(parsed.emails)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return buildSeed();
}

export interface StoreApi {
  state: AppState;
  currentUser: DemoUser;
  vendors: Vendor[];
  setUser: (u: DemoUser) => void;
  reset: () => void;
  getVendor: (id: string) => Vendor | undefined;
  getByInvite: (inviteId: string) => Vendor | undefined;
  update: (id: string, fn: (v: Vendor) => Vendor) => void;
  patch: (id: string, patch: Partial<Vendor>) => void;
  audit: (id: string, actor: string, kind: AuditEntry['kind'], message: string, detail?: string) => void;
  invite: (email: string, country: Country, category: string) => Vendor;
  addSap: (sap: SapVendor) => void;
  email: (vendorId: string, kind: EmailKind, subject: string, bodyEn: string, bodyAr: string) => void;
  addNote: (vendorId: string, text: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setFlags: (patch: Partial<Pick<AppState, 'lastSeenAt' | 'tourDone' | 'welcomeDismissed'>>) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state]);

  const api = useMemo<StoreApi>(() => {
    const update = (id: string, fn: (v: Vendor) => Vendor) => dispatch({ type: 'update', id, fn });
    const audit: StoreApi['audit'] = (id, actor, kind, message, detail) =>
      update(id, (v) => ({ ...v, audit: [...v.audit, { id: uid('a-'), at: nowIso(), actor, kind, message, detail }] }));
    return {
      state,
      currentUser: state.currentUser,
      vendors: state.vendors,
      setUser: (user) => dispatch({ type: 'setUser', user }),
      reset: () => {
        localStorage.removeItem(STORAGE_KEY);
        dispatch({ type: 'reset' });
      },
      getVendor: (id) => state.vendors.find((v) => v.id === id),
      getByInvite: (inviteId) => state.vendors.find((v) => v.inviteId === inviteId),
      update,
      patch: (id, patch) => update(id, (v) => ({ ...v, ...patch })),
      audit,
      invite: (email, country, category) => {
        const existing = state.vendors.find((v) => v.email.toLowerCase() === email.toLowerCase() && (v.status === 'invited' || v.status === 'draft'));
        if (existing) return existing;
        const at = nowIso();
        const vendor: Vendor = {
          id: uid('v-'),
          inviteId: `inv-${uid()}`,
          email,
          country,
          category,
          status: 'invited',
          name: '',
          invitedBy: state.currentUser,
          invitedAt: at,
          returnCount: 0,
          lang: 'en',
          stage: 'welcome',
          formStep: 0,
          company: { regNumber: '', legalName: '', legalNameAr: '', regStatus: '', issueDate: '', expiryDate: '', city: '', address: '' },
          tax: { vatNumber: '' },
          bank: { iban: '', bankName: '', accountHolder: '' },
          contacts: { sales: { name: '', email: '', phone: '' }, ar: { name: '', email: '', phone: '' } },
          documents: {},
          audit: [{ id: uid('a-'), at, actor: state.currentUser, kind: 'review', message: `Invite sent to ${email} · ${country} · ${category}` }],
          notes: [],
          bankIsNew: true,
        };
        dispatch({ type: 'addVendor', vendor });
        dispatch({ type: 'addEmail', email: { id: uid('e-'), at, to: email, vendorId: vendor.id, kind: 'invite', subject: 'MAGRABi · Your vendor registration link', bodyEn: `Hello,\n\nMAGRABi has invited you to register as a supplier (${category}). Use the link below. It takes about 10 minutes and you can save and come back.\n\n/vendor/${vendor.inviteId}\n\nKind regards,\n${state.currentUser.split(' ')[0]} · MAGRABi Procurement`, bodyAr: `مرحبًا،\n\nدعتكم مغربي للتسجيل كمورّد (${category}). استخدموا الرابط أدناه. يستغرق الأمر حوالي 10 دقائق ويمكنكم الحفظ والعودة لاحقًا.\n\n/vendor/${vendor.inviteId}\n\nمع أطيب التحيات،\nالمشتريات، مغربي` } });
        return vendor;
      },
      addSap: (sap) => dispatch({ type: 'addSap', sap }),
      email: (vendorId, kind, subject, bodyEn, bodyAr) => {
        const v = state.vendors.find((x) => x.id === vendorId);
        if (!v) return;
        dispatch({ type: 'addEmail', email: { id: uid('e-'), at: nowIso(), to: v.email, vendorId, kind, subject, bodyEn, bodyAr } });
      },
      addNote: (vendorId, text) => update(vendorId, (v) => ({ ...v, notes: [...v.notes, { id: uid('n-'), at: nowIso(), by: state.currentUser, text }] })),
      setSettings: (patch) => dispatch({ type: 'settings', patch }),
      setFlags: (patch) => dispatch({ type: 'flags', patch }),
    };
  }, [state]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}
