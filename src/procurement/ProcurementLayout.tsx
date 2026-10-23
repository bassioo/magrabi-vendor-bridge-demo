import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListChecks, RotateCcw, UserRound, Building2, Globe2, Search, ChevronDown, Mail, SlidersHorizontal, PlayCircle, Menu, X } from 'lucide-react';
import { NotificationsBell } from '@/components/NotificationsBell';
import { useTour } from '@/app/Tour';
import { Brand } from '@/components/Brand';
import { DemoBanner } from '@/components/DemoBanner';
import { useStore } from '@/app/store';
import type { DemoUser } from '@/lib/types';

export function ProcurementLayout() {
  const { currentUser, setUser, reset, vendors } = useStore();
  const navigate = useNavigate();
  const [armed, setArmed] = useState(false);
  const [q, setQ] = useState('');
  const [drawer, setDrawer] = useState(false);
  const tour = useTour();
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  const queued = vendors.filter((v) => v.status === 'submitted' || v.status === 'in_review').length;
  const item = ({ isActive }: { isActive: boolean }) => `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-cream text-ink' : 'text-body hover:bg-white/70'}`;
  const hits = q.trim().length > 1 ? vendors.filter((v) => (v.name + ' ' + v.email).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];

  return (
    <div className="flex min-h-screen bg-greige">
      {drawer && <div className="fixed inset-0 z-40 bg-espresso/40 md:hidden" onClick={() => setDrawer(false)} />}
      <aside className={`fixed inset-y-0 start-0 z-50 flex h-screen w-64 shrink-0 flex-col border-e border-champagne/40 bg-greige px-4 py-5 transition-transform md:sticky md:top-0 md:z-auto md:w-60 md:translate-x-0 md:bg-greige/80 ${drawer ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} onClick={() => setDrawer(false)}>
        <div className="flex items-center justify-between px-2">
          <NavLink to="/"><Brand /></NavLink>
          <button className="btn-ghost p-1 md:hidden" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Onboarding</div>
        <nav className="mt-2 flex flex-col gap-1">
          <NavLink to="/procurement" end className={item}><LayoutDashboard size={17} /> Dashboard</NavLink>
          <NavLink to="/procurement/queue" className={item} data-tour="nav-queue">
            <ListChecks size={17} /> Queue
            {queued > 0 && <span className="ms-auto rounded-full bg-gold px-1.5 text-[10px] font-semibold text-white">{queued}</span>}
          </NavLink>
          <NavLink to="/procurement/outbox" className={item}><Mail size={17} /> Outbox</NavLink>
        </nav>
        <div className="mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Master data</div>
        <nav className="mt-2 flex flex-col gap-1">
          <NavLink to="/procurement/vendors" end className={item}><Building2 size={17} /> Vendors</NavLink>
        </nav>
        <div className="mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Setup</div>
        <nav className="mt-2 flex flex-col gap-1">
          <NavLink to="/procurement/countries" className={item}><Globe2 size={17} /> Country rules</NavLink>
          <NavLink to="/procurement/settings" className={item}><SlidersHorizontal size={17} /> Settings</NavLink>
        </nav>
        <button className="mt-4 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-teal hover:bg-white/70" onClick={(e) => { e.stopPropagation(); tour.start(); }}><PlayCircle size={17} /> Guided tour</button>
        <div className="mt-auto rounded-xl border border-champagne/50 bg-white/60 p-3">
          <div className="flex items-center gap-2 text-[11px] text-muted"><UserRound size={13} className="text-gold-deep" /> Signed in as</div>
          <label className="mt-1 flex items-center gap-1 text-sm font-medium text-ink">
            <select value={currentUser} onChange={(e) => setUser(e.target.value as DemoUser)} className="w-full appearance-none bg-transparent pr-4 focus:outline-none" aria-label="Demo user">
              <option>Deena (Approver)</option>
              <option>Hana (Requester)</option>
            </select>
            <ChevronDown size={14} className="-ml-4 pointer-events-none text-muted" />
          </label>
          <button
            className={`mt-3 w-full text-xs ${armed ? 'btn-primary' : 'btn-secondary'}`}
            title={armed ? 'Click again to restore the sample data' : 'Restore the sample data'}
            onClick={() => {
              if (!armed) { setArmed(true); return; }
              setArmed(false);
              reset();
              navigate('/procurement');
            }}
          >
            <RotateCcw size={13} /> {armed ? 'Confirm reset' : 'Reset demo'}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-champagne/40 bg-white/85 backdrop-blur">
          <div className="flex items-center gap-4 px-6 py-3">
            <button className="btn-ghost p-2 md:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
            <NavLink to="/" className="md:hidden"><Brand compact /></NavLink>
            <div className="relative w-full max-w-md">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendors  ·  press /" className="input !py-2 !pl-9 text-sm" aria-label="Search vendors" />
              {hits.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-xl border border-champagne/60 bg-white shadow-card">
                  {hits.map((v) => (
                    <button key={v.id} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-cream" onClick={() => { setQ(''); navigate(v.status === 'invited' || v.status === 'draft' ? '/procurement/queue' : `/procurement/vendors/${v.id}`); }}>
                      <span className="text-ink">{v.name || v.email}</span><span className="text-xs text-muted">{v.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="ms-auto hidden items-center gap-2 md:flex"><DemoBanner inline /><NotificationsBell /></div>
            <div className="ms-auto flex items-center gap-2 md:hidden">
              <select value={currentUser} onChange={(e) => setUser(e.target.value as DemoUser)} className="input !w-auto !py-1.5 text-xs" aria-label="Demo user">
                <option>Deena (Approver)</option>
                <option>Hana (Requester)</option>
              </select>
            </div>
          </div>

        </header>
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 md:px-6 md:py-8">
          <Outlet />
        </main>
        <footer className="px-6 py-5 text-center text-xs text-muted">Demo · sample data · MAGRABi Vendor Management</footer>
      </div>
      <div className="md:hidden"><DemoBanner /></div>
    </div>
  );
}
