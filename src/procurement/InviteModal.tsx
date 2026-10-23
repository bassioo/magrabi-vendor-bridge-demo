import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OPEN_LINKS_IN_NEW_TAB, vendorLink } from '@/lib/routerMode';
import { Copy, ExternalLink, Link2, X, Check } from 'lucide-react';
import { useStore } from '@/app/store';
import type { Country, Vendor } from '@/lib/types';
import { CATEGORIES, COUNTRY_LABELS } from '@/data/checklists';
import { COUNTRIES, COUNTRY_ORDER } from '@/data/countries';
import { useToast } from '@/components/Toast';

export function InviteModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [email, setEmail] = useState('accounts@alnoor-print.example');
  const [country, setCountry] = useState<Country>('KSA');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const link = vendor ? vendorLink(vendor.inviteId) : '';
  const navigate = useNavigate();

  const generate = () => setVendor(store.invite(email.trim(), country, category));
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
    setCopied(true);
    toast('Invitation link copied.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="invite-title">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Invite vendor</div>
            <h2 id="invite-title" className="text-2xl">One link, <span className="accent">both languages.</span></h2>
          </div>
          <button className="btn-ghost p-1" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {!vendor ? (
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Vendor email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} list="sample-emails" />
              <datalist id="sample-emails">
                <option value="accounts@alnoor-print.example">Al Noor Print House · KSA</option>
                <option value="finance@jeddahfixtures.example">Jeddah Optical Fixtures · KSA</option>
                <option value="accounts@gulfshopfit.example">Gulf Shopfit · Kuwait</option>
                <option value="finance@dohapromo.example">Doha Promotions · Qatar</option>
                <option value="accounts@muscatfm.example">Muscat Facilities Management · Oman</option>
              </datalist>
              <div className="mt-1 text-[11px] text-muted">Demo: sample vendors with matching documents are <button type="button" className="underline" onClick={() => setEmail('finance@jeddahfixtures.example')}>Jeddah Optical Fixtures</button> (KSA) and <button type="button" className="underline" onClick={() => setEmail('accounts@alnoor-print.example')}>Al Noor Print House</button> (KSA).</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Country</label>
                <select className="input" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
                  {COUNTRY_ORDER.map((c) => <option key={c} value={c}>{COUNTRY_LABELS[c].flag} {COUNTRY_LABELS[c].en}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
              </div>
            </div>
            <p className="text-xs text-muted">The vendor sees the {COUNTRY_LABELS[country].en} checklist: {COUNTRIES[country].checklist.map((i) => i.label.toLowerCase()).join(', ')}.{!COUNTRIES[country].tax.applicable && ' No VAT in this market, so the tax number is optional.'}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={generate} disabled={!email.includes('@')}><Link2 size={14} /> Generate link</button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="rounded-xl bg-cream p-4">
              <div className="text-xs text-gold-deep">Invitation link for {vendor.email} · {COUNTRY_LABELS[vendor.country].en} · {vendor.category}</div>
              <div className="mt-1 break-all font-mono text-sm text-ink">{link}</div>
            </div>
            <p className="mt-3 text-xs text-muted">Invited by {vendor.invitedBy}. Email sending is simulated in this demo. Someone else must approve this vendor (segregation of duties).</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button className="btn-secondary" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy link'}</button>
              {OPEN_LINKS_IN_NEW_TAB ? (
                <a className="btn-teal" href={link} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open link</a>
              ) : (
                <button className="btn-teal" onClick={() => { onClose(); navigate(`/vendor/${vendor.inviteId}`); }}><ExternalLink size={14} /> Open link</button>
              )}
              <button className="btn-ghost" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
