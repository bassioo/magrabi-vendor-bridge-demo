import { useState } from 'react';
import { Copy, ExternalLink, Link2, Check } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { ErrorBox } from '@/components/ErrorBox';
import { useToast } from '@/components/Toast';
import { useInvite } from '@/api/hooks';
import { CATEGORIES, COUNTRIES, COUNTRY_ORDER, type Country, type Lang, type Vendor } from '@vendorhub/shared';

export function InviteModal({ onClose }: { onClose: () => void }) {
  const invite = useInvite();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>('KSA');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [lang, setLang] = useState<Lang>('en');
  const [result, setResult] = useState<{ vendor: Vendor; link: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.link); setCopied(true); toast('Invitation link copied.'); setTimeout(() => setCopied(false), 2000); } catch { toast('Copy failed. Select the link and copy it manually.', 'warn'); }
  };
  return (
    <Modal eyebrow="Invite vendor" title={<>One link, <span className="accent">both languages.</span></>} onClose={onClose}>
      {!result ? (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); invite.mutate({ email: email.trim(), country, category, lang }, { onSuccess: (r) => { setResult(r); toast(`Invitation sent to ${r.vendor.email}.`); } }); }}>
          <div><label className="label" htmlFor="inv-email">Vendor email</label><input id="inv-email" className="input" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="accounts@supplier.com" /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="label" htmlFor="inv-country">Country</label><select id="inv-country" className="input" value={country} onChange={(e) => setCountry(e.target.value as Country)}>{COUNTRY_ORDER.map((c) => <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}</option>)}</select></div>
            <div><label className="label" htmlFor="inv-cat">Category</label><select id="inv-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div><label className="label">Email language</label><div className="flex gap-2">{(['en', 'ar'] as Lang[]).map((l) => <button type="button" key={l} className={`rounded-xl border px-3 py-1.5 text-sm ${lang === l ? 'border-gold bg-cream text-ink' : 'border-champagne/70 text-body'}`} onClick={() => setLang(l)}>{l === 'en' ? 'English' : 'العربية'}</button>)}</div></div>
          <p className="text-xs text-muted">The vendor sees the {COUNTRIES[country].name} checklist: {COUNTRIES[country].checklist.map((i) => i.label.toLowerCase()).join(', ')}.{!COUNTRIES[country].tax.applicable && ' No VAT in this market, so the tax number is optional.'}</p>
          <ErrorBox error={invite.error} />
          <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={invite.isPending}><Link2 size={14} /> Send invitation</button></div>
        </form>
      ) : (
        <div>
          <div className="rounded-xl bg-cream p-4"><div className="text-xs text-gold-deep">Invitation for {result.vendor.email} · {COUNTRIES[result.vendor.country].name} · {result.vendor.category}</div><div className="mt-1 break-all font-mono text-sm text-ink">{result.link}</div></div>
          <p className="mt-3 text-xs text-muted">Emailed to the vendor. Invited by {result.vendor.invitedBy}; someone else must approve them.</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button className="btn-secondary" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy link'}</button>
            <a className="btn-teal" href={result.link} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open link</a>
            <button className="btn-ghost" onClick={onClose}>Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
