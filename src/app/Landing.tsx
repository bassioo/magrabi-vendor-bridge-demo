import { Link, useNavigate } from 'react-router-dom';
import { useTour } from './Tour';
import { Building2, ClipboardCheck, PlayCircle } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { DemoBanner } from '@/components/DemoBanner';
import { useStore } from './store';

export function Landing() {
  const { vendors } = useStore();
  const tour = useTour();
  const navigate = useNavigate();
  const pending = vendors.find((v) => v.status === 'invited' || v.status === 'draft') ?? vendors[0];
  return (
    <div className="min-h-screen bg-greige lens-bg">
      <header className="flex items-center gap-3 px-8 py-5">
        <Brand />
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-12 md:pt-20">
        <div className="eyebrow mb-3">MAGRABi Vendor Management · AI bridge · demo</div>
        <h1 className="max-w-3xl text-5xl leading-[1.1] md:text-6xl">
          Vendor onboarding, <span className="accent">without the email chase.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-body">
          One bilingual link for vendors. One queue for procurement. AI reads. Rules check. Registries confirm. <span className="font-semibold text-ink">A person decides.</span>
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button className="btn-primary px-5 py-3" onClick={() => { navigate('/procurement'); tour.start(); }}><PlayCircle size={18} /> Take the 3-minute tour</button>
          <span className="text-sm text-muted">or pick a side below</span>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Link to={`/vendor/${pending?.inviteId ?? 'inv-alnoor-7f3k'}`} className="card group p-8 transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/10 text-teal">
              <Building2 />
            </div>
            <div className="mt-6 font-serif text-2xl text-ink">Open as vendor</div>
            <p className="mt-2 text-sm text-body">Register through the invitation link. English or Arabic, instant feedback on every document.</p>
            <div className="mt-6 text-sm font-medium text-teal group-hover:underline">Open the invitation →</div>
          </Link>
          <Link to="/procurement" className="card group p-8 transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold-deep">
              <ClipboardCheck />
            </div>
            <div className="mt-6 font-serif text-2xl text-ink">Open as procurement</div>
            <p className="mt-2 text-sm text-body">Dashboard, review queue across seven markets, checks beside the documents, and a ready-to-key SAP sheet.</p>
            <div className="mt-6 text-sm font-medium text-gold-deep group-hover:underline">Open the console →</div>
          </Link>
        </div>
        <div className="mt-14 grid gap-4 text-sm text-body md:grid-cols-4">
          {[
            ['AI reads', 'Documents are read the moment they land. Fields are extracted beside the scan.'],
            ['Rules check', 'IBAN checksum, 6-month bank letter, expiry dates, name consistency.'],
            ['Registries confirm', 'Wathq, Sijilat, ZATCA, FTA, NBR and the SAP vendor list. Simulated in this demo.'],
            ['A person decides', 'Every approval is a human click. Bank details always stay with a person.'],
          ].map(([h, p]) => (
            <div key={h} className="rounded-card border border-champagne/50 bg-white/60 p-4">
              <div className="font-serif text-lg text-ink">{h}</div>
              <p className="mt-1 text-xs leading-relaxed text-body/80">{p}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="px-8 py-6 text-xs text-muted">Demo · sample data · MAGRABi Vendor Management</footer>
      <DemoBanner />
    </div>
  );
}
