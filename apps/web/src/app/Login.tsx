import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, UserRound } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { ErrorBox } from '@/components/ErrorBox';
import { ApiError } from '@/api/client';
import { useDemoLogin, useMe, useRequestLink } from '@/api/hooks';

const DEMO_USERS = [
  { email: 'deena@magrabi.example', name: 'Deena', role: 'Approver · all markets' },
  { email: 'hana@magrabi.example', name: 'Hana', role: 'Requester · all markets' },
  { email: 'omar@magrabi.example', name: 'Omar', role: 'Approver · Egypt' },
  { email: 'admin@magrabi.example', name: 'Admin', role: 'Administrator' },
];

export function Login() {
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const request = useRequestLink();
  const demo = useDemoLogin();
  const from = (location.state as { from?: string } | null)?.from;
  const dest = from && from.startsWith('/app') ? from : '/app';
  if (me.data?.user) { navigate(dest, { replace: true }); return null; }
  const isDemo = me.data?.mode === 'demo' || (me.error instanceof ApiError && me.error.extra.mode === 'demo');
  return (
    <div className="flex min-h-screen flex-col bg-greige lens-bg">
      <header className="px-6 py-5 md:px-8"><Link to="/"><Brand /></Link></header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
        <div className="card p-8">
          <div className="eyebrow">Procurement</div>
          <h1 className="mt-1 text-3xl">Sign in, <span className="accent">no password.</span></h1>
          {sent ? (
            <div className="mt-6 rounded-xl bg-pass-bg p-4 text-sm text-pass">
              <Mail size={16} className="mb-1 inline" /> If <b>{email}</b> belongs to a MAGRABi user, a sign-in link is on its way. It is valid for 15 minutes.
              {isDemo && <div className="mt-2 text-xs text-body">Demo mode: the link is in the Outbox and in the server log instead of your inbox.</div>}
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); request.mutate(email, { onSuccess: () => setSent(true) }); }}>
              <div><label className="label" htmlFor="email">Work email</label><input id="email" className="input" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@magrabi.com" /></div>
              <ErrorBox error={request.error} />
              <button className="btn-primary w-full" disabled={request.isPending}>Email me a sign-in link <ArrowRight size={16} /></button>
            </form>
          )}
        </div>
        <DemoShortcuts onPick={(e) => demo.mutate(e, { onSuccess: () => navigate(dest, { replace: true }) })} pending={demo.isPending} error={demo.error} />
      </main>
      <footer className="px-8 py-6 text-xs text-muted">MAGRABi Vendor Hub</footer>
    </div>
  );
}

function DemoShortcuts({ onPick, pending, error }: { onPick: (email: string) => void; pending: boolean; error: unknown }) {
  const me = useMe();
  // The API tells us the mode even when signed out (401 body carries mode in demo). We also try the demo-login endpoint lazily.
  const mode = me.data?.mode ?? (me.error instanceof ApiError ? (me.error.extra.mode as string | undefined) : undefined);
  const [tried, setTried] = useState(false);
  if (mode === 'live') return null;
  return (
    <div className="card mt-4 p-5">
      <div className="flex items-center gap-2 text-xs text-muted"><UserRound size={14} className="text-gold-deep" /> Demo mode · sign in as a sample user</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {DEMO_USERS.map((u) => (
          <button key={u.email} className="btn-secondary justify-start text-sm" disabled={pending} onClick={() => { setTried(true); onPick(u.email); }}>
            <span className="flex flex-col items-start leading-tight"><span>{u.name}</span><span className="text-[11px] font-normal text-muted">{u.role}</span></span>
          </button>
        ))}
      </div>
      {tried && error ? <ErrorBox error={error} className="mt-3" /> : null}
      <p className="mt-3 text-[11px] text-muted">These buttons only work when the server runs in demo mode.</p>
    </div>
  );
}
