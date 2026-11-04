import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Inbox, Building2, Mail, BarChart3, SlidersHorizontal, Search, Menu, X, LogOut, ChevronDown, RotateCcw } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { NotificationsBell } from './NotificationsBell';
import { useDemoReset, useLogout, useMe, useVendors } from '@/api/hooks';
import { useToast } from '@/components/Toast';
import { Skeleton } from '@/components/Skeleton';

export function StaffLayout() {
  const me = useMe();
  const navigate = useNavigate();
  const logout = useLogout();
  const reset = useDemoReset();
  const toast = useToast();
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const hits = useVendors({ status: 'all', q: q.trim().length > 1 ? q.trim() : '' });
  const queue = useVendors({ status: 'queue' });
  const queued = queue.data?.rows.length ?? 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (me.isError) navigate('/login', { replace: true, state: { from: window.location.pathname } }); }, [me.isError, navigate]);

  if (me.isLoading || !me.data) return <div className="p-8"><Skeleton className="h-8 w-48" /><Skeleton className="mt-6 h-40 w-full" /></div>;
  const user = me.data.user;
  const item = ({ isActive }: { isActive: boolean }) => `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-cream text-ink' : 'text-body hover:bg-white/70'}`;
  const rows = q.trim().length > 1 ? (hits.data?.rows ?? []).slice(0, 6) : [];

  return (
    <div className="flex min-h-screen bg-greige">
      {drawer && <div className="fixed inset-0 z-40 bg-espresso/40 md:hidden" onClick={() => setDrawer(false)} />}
      <aside className={`fixed inset-y-0 start-0 z-50 flex h-screen w-64 shrink-0 flex-col border-e border-champagne/40 bg-greige px-4 py-5 transition-transform md:sticky md:top-0 md:z-auto md:w-60 md:translate-x-0 md:bg-greige/80 ${drawer ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} onClick={() => setDrawer(false)}>
        <div className="flex items-center justify-between px-2"><NavLink to="/app"><Brand /></NavLink><button className="btn-ghost p-1 md:hidden" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={18} /></button></div>
        <div className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Onboarding</div>
        <nav className="mt-2 flex flex-col gap-1">
          <NavLink to="/app" end className={item}><Inbox size={17} /> Dashboard</NavLink>
          <NavLink to="/app/queue" className={item}><Inbox size={17} /> Inbox{queued > 0 && <span className="ms-auto rounded-full bg-gold px-1.5 text-[10px] font-semibold text-white">{queued}</span>}</NavLink>
          <NavLink to="/app/outbox" className={item}><Mail size={17} /> Outbox</NavLink>
        </nav>
        <div className="mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Master data</div>
        <nav className="mt-2 flex flex-col gap-1"><NavLink to="/app/sap" className={item}><Building2 size={17} /> Vendors</NavLink><NavLink to="/app/reports" className={item}><BarChart3 size={17} /> Reports</NavLink></nav>
        <div className="mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Setup</div>
        <nav className="mt-2 flex flex-col gap-1"><NavLink to="/app/settings" className={item}><SlidersHorizontal size={17} /> Settings</NavLink></nav>
        <div className="mt-auto rounded-xl border border-champagne/50 bg-white/60 p-3">
          <div className="text-sm font-medium text-ink">{user.name}</div>
          <div className="text-[11px] text-muted">{user.role} · {user.markets === 'all' ? 'all markets' : user.markets.join(', ')}</div>
          {me.data.mode === 'demo' && (
            <button className="btn-secondary mt-3 w-full text-xs" onClick={(e) => { e.stopPropagation(); if (confirmReset()) reset.mutate(undefined, { onSuccess: () => { toast('Demo data restored.', 'info'); navigate('/app'); } }); }}><RotateCcw size={13} /> Reset demo data</button>
          )}
          <button className="btn-ghost mt-1 w-full text-xs" onClick={(e) => { e.stopPropagation(); logout.mutate(undefined, { onSuccess: () => navigate('/login') }); }}><LogOut size={13} /> Sign out</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-champagne/40 bg-white/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <button className="btn-ghost p-2 md:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
            <NavLink to="/app" className="md:hidden"><Brand compact /></NavLink>
            <div className="relative w-full max-w-md">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendors  ·  press /" className="input !py-2 !pl-9 text-sm" aria-label="Search vendors" />
              {rows.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-xl border border-champagne/60 bg-white shadow-card">
                  {rows.map((v) => (
                    <button key={v.id} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-cream" onClick={() => { setQ(''); navigate(`/app/vendors/${v.id}`); }}>
                      <span className="text-ink">{v.name || v.email}</span><span className="text-xs text-muted">{v.country} · {v.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="ms-auto flex items-center gap-2">
              {me.data.mode === 'demo' && <span className="hidden rounded-full border border-champagne bg-cream px-3 py-1 text-[11px] font-medium text-gold-deep md:inline">Demo · sample data</span>}
              <NotificationsBell />
              <div className="relative">
                <button className="btn-ghost text-xs" onClick={() => setMenu((m) => !m)} aria-haspopup="menu"><span className="hidden sm:inline">{user.name}</span><ChevronDown size={14} /></button>
                {menu && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-champagne/60 bg-white shadow-card" role="menu" onMouseLeave={() => setMenu(false)}>
                    <div className="px-3 py-2 text-xs text-muted">{user.email}</div>
                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-cream" onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}><LogOut size={14} /> Sign out</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 md:px-6 md:py-8"><Outlet context={me.data} /></main>
        <footer className="px-6 py-5 text-center text-xs text-muted">MAGRABi Vendor Hub</footer>
      </div>
    </div>
  );
}

function confirmReset(): boolean {
  // confirm() is unavailable in some embedded viewers; fall back to a double-click pattern via sessionStorage
  try {
    const last = Number(sessionStorage.getItem('vh_reset_armed') ?? 0);
    if (Date.now() - last < 4000) { sessionStorage.removeItem('vh_reset_armed'); return true; }
    sessionStorage.setItem('vh_reset_armed', String(Date.now()));
  } catch { return true; }
  return false;
}
