import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ClipboardCheck, ArrowRight } from 'lucide-react';
import { Brand } from '@/components/Brand';

function tokenFrom(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/\/v\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{12,}$/.test(s)) return s;
  return null;
}

export function Landing() {
  const navigate = useNavigate();
  const [link, setLink] = useState('');
  const [err, setErr] = useState('');
  const open = () => {
    const t = tokenFrom(link);
    if (!t) { setErr('Paste the full link from your invitation email, or the code at the end of it.'); return; }
    navigate(`/v/${t}`);
  };
  return (
    <div className="min-h-screen bg-greige lens-bg">
      <header className="flex items-center justify-between px-6 py-5 md:px-8"><Brand /><Link to="/login" className="btn-secondary !py-1.5 text-xs">Staff sign in</Link></header>
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-10 md:pt-16">
        <div className="eyebrow mb-3">MAGRABi Vendor Hub</div>
        <h1 className="max-w-3xl text-4xl leading-[1.1] md:text-6xl">Vendor onboarding, <span className="accent">without the email chase.</span></h1>
        <p className="mt-6 max-w-2xl text-lg text-body">One bilingual link for vendors. One queue for procurement. AI reads. Rules check. Registries confirm. <span className="font-semibold text-ink">A person decides.</span></p>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="card p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/10 text-teal"><Building2 /></div>
            <div className="mt-6 font-serif text-2xl text-ink">Vendors</div>
            <p className="mt-2 text-sm text-body">Open the link from your invitation email. It takes about 10 minutes, in English or Arabic, and you can save and come back.</p>
            <div className="mt-4 flex gap-2">
              <input className="input" placeholder="Paste your invitation link" value={link} onChange={(e) => { setLink(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && open()} aria-label="Invitation link" />
              <button className="btn-teal shrink-0" onClick={open}>Open <ArrowRight size={14} /></button>
            </div>
            {err && <div className="mt-2 text-xs text-fail">{err}</div>}
            <p className="mt-3 text-xs text-muted">No invitation yet? Ask your MAGRABi contact to invite you.</p>
          </div>
          <Link to="/login" className="card group p-8 transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold-deep"><ClipboardCheck /></div>
            <div className="mt-6 font-serif text-2xl text-ink">Procurement</div>
            <p className="mt-2 text-sm text-body">Inbox, review with the documents beside the checks, approvals with the right controls, and a ready-to-key SAP sheet.</p>
            <div className="mt-6 text-sm font-medium text-gold-deep group-hover:underline">Sign in with your work email →</div>
          </Link>
        </div>
        <div className="mt-14 grid gap-4 text-sm text-body md:grid-cols-4">
          {[['AI reads', 'Documents are read the moment they land. Fields are extracted beside the scan.'], ['Rules check', 'IBAN checksum, bank-letter age, expiry dates, name consistency.'], ['Registries confirm', 'Commercial registries, tax authorities and the SAP vendor list.'], ['A person decides', 'Every approval is a human click. Bank details always stay with a person.']].map(([h, p]) => (
            <div key={h} className="rounded-card border border-champagne/50 bg-white/60 p-4"><div className="font-serif text-lg text-ink">{h}</div><p className="mt-1 text-xs leading-relaxed text-body/80">{p}</p></div>
          ))}
        </div>
      </main>
      <footer className="px-8 py-6 text-xs text-muted">MAGRABi Vendor Hub</footer>
    </div>
  );
}
