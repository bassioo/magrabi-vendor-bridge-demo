import { useEffect, useState } from 'react';
import { NavLink, useOutletContext, useParams } from 'react-router-dom';
import { ShieldCheck, UserRound, Globe2, Upload, Info, Plus, Trash2, ArrowUp, ArrowDown, Save } from 'lucide-react';
import { useCountries, useCreateUser, useSapImport, useSaveCountry, useSettings, useUpdateSettings, useUpdateUser, useUsers, type Me } from '@/api/hooks';
import { useToast } from '@/components/Toast';
import { ErrorBox } from '@/components/ErrorBox';
import { Skeleton } from '@/components/Skeleton';
import { Forbidden } from '@/app/NotFound';
import { COUNTRY_ORDER, IBAN_SPECS, type ChecklistItem, type Country, type CountryProfile, type Role, type Settings as SettingsT, type User } from '@vendorhub/shared';

function Toggle({ checked, onChange, label, help, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; help: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start justify-between gap-4 py-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <span><span className="block text-sm font-medium text-ink">{label}</span><span className="block text-xs text-muted">{help}</span></span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-champagne/60 transition peer-checked:bg-gold peer-focus-visible:ring-2 peer-focus-visible:ring-gold/40" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

const SECTIONS = [['policies', 'Policies', ShieldCheck], ['team', 'Team', UserRound], ['countries', 'Country rules', Globe2], ['sap', 'SAP import', Upload], ['about', 'About', Info]] as const;

export function Settings() {
  const me = useOutletContext<Me>();
  const { section = 'policies' } = useParams();
  const admin = me.user.role === 'admin';
  return (
    <div className="page-enter">
      <div className="eyebrow mb-2">Setup</div>
      <h1 className="text-4xl">Settings, <span className="accent">not code.</span></h1>
      <div className="mt-6 grid gap-6 md:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">{SECTIONS.map(([k, l, I]) => <NavLink key={k} to={`/app/settings/${k}`} className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${isActive || (k === 'policies' && section === 'policies') ? 'bg-cream text-ink' : 'text-body hover:bg-white/70'}`}><I size={16} /> {l}</NavLink>)}</nav>
        <div>
          {section === 'policies' && <Policies admin={admin} />}
          {section === 'team' && (admin ? <Team /> : <Forbidden what="Team settings" />)}
          {section === 'countries' && <CountryRules admin={admin} />}
          {section === 'sap' && (admin ? <SapImport /> : <Forbidden what="SAP import" />)}
          {section === 'about' && <About me={me} />}
        </div>
      </div>
    </div>
  );
}

function Policies({ admin }: { admin: boolean }) {
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();
  const toast = useToast();
  if (isLoading || !data) return <Skeleton className="h-72" />;
  const s = data.settings;
  const set = (patch: Partial<SettingsT>, msg: string) => update.mutate(patch, { onSuccess: () => toast(msg, 'info') });
  const num = (key: keyof SettingsT, label: string, help: string, options: number[], unit: string) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <span><span className="block text-sm font-medium text-ink">{label}</span><span className="block text-xs text-muted">{help}</span></span>
      <select value={s[key] as number} disabled={!admin} onChange={(e) => set({ [key]: Number(e.target.value) } as Partial<SettingsT>, `${label} set to ${e.target.value} ${unit}.`)} className="input !w-auto !py-1.5 text-sm">{options.map((m) => <option key={m} value={m}>{m} {unit}</option>)}</select>
    </div>
  );
  return (
    <section className="card p-5">
      <div className="eyebrow">Approval policies</div>
      {!admin && <p className="mt-1 text-xs text-muted">Read only. Administrators can change these.</p>}
      <div className="mt-2 divide-y divide-greige">
        <Toggle disabled={!admin} checked={s.requireCallback} onChange={(v) => set({ requireCallback: v }, v ? 'Call-back confirmation required before approval.' : 'Call-back confirmation no longer required.')} label="Bank details confirmed by call-back" help="Approval of new bank details is blocked until the approver records a call-back." />
        <Toggle disabled={!admin} checked={s.segregationOfDuties} onChange={(v) => set({ segregationOfDuties: v }, v ? 'Segregation of duties on.' : 'Segregation of duties off.')} label="Segregation of duties" help="The person who invited a vendor cannot approve that vendor." />
        <Toggle disabled={!admin} checked={s.autoAssign} onChange={(v) => set({ autoAssign: v }, v ? 'Reviews are assigned to whoever opens them.' : 'Reviews stay unassigned until someone takes them.')} label="Assign on open" help="Opening a submitted vendor assigns the review to you." />
        {num('bankLetterMaxMonths', 'Bank letter age limit', 'Letters older than this are rejected at upload.', [3, 6, 12], 'months')}
        {num('inviteValidDays', 'Invitation validity', 'After this, the link expires and must be resent.', [14, 30, 60, 90], 'days')}
        {num('reminderAfterDays', 'Reminder after', 'Vendors who have not submitted get a reminder email.', [2, 3, 5, 7], 'days')}
        {num('slaReviewDays', 'Review target', 'Submissions older than this show as overdue.', [1, 2, 3, 5], 'days')}
      </div>
      <ErrorBox error={update.error} className="mt-3" />
    </section>
  );
}

const ROLES: Role[] = ['requester', 'approver', 'admin'];

function Team() {
  const { data, isLoading } = useUsers();
  const create = useCreateUser();
  const update = useUpdateUser();
  const toast = useToast();
  const [form, setForm] = useState<{ email: string; name: string; role: Role; markets: Country[] | 'all' }>({ email: '', name: '', role: 'requester', markets: 'all' });
  const MarketPicker = ({ value, onChange }: { value: Country[] | 'all'; onChange: (v: Country[] | 'all') => void }) => (
    <div className="flex flex-wrap gap-1">
      <button type="button" onClick={() => onChange('all')} className={`rounded-full px-2 py-0.5 text-[11px] ${value === 'all' ? 'bg-ink text-white' : 'bg-greige text-body'}`}>All</button>
      {COUNTRY_ORDER.map((c) => { const on = value !== 'all' && value.includes(c); return <button type="button" key={c} onClick={() => { const cur = value === 'all' ? [] : value; onChange(on ? cur.filter((x) => x !== c) : [...cur, c]); }} className={`rounded-full px-2 py-0.5 text-[11px] ${on ? 'bg-gold text-white' : 'bg-greige text-body'}`}>{c}</button>; })}
    </div>
  );
  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="eyebrow">Team</div>
        {isLoading ? <Skeleton className="mt-3 h-40" /> : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-muted"><tr><th className="py-2 font-semibold">Person</th><th className="py-2 font-semibold">Role</th><th className="py-2 font-semibold">Markets</th><th className="py-2 font-semibold">Active</th></tr></thead>
            <tbody>{(data?.rows ?? []).map((u: User) => (
              <tr key={u.id} className="border-t border-greige">
                <td className="py-2 pr-3"><div className="font-medium text-ink">{u.name}</div><div className="text-xs text-muted">{u.email}{u.lastLoginAt ? ` · last sign-in ${new Date(u.lastLoginAt).toLocaleDateString('en-GB')}` : ''}</div></td>
                <td className="py-2 pr-3"><select className="input !w-auto !py-1 text-xs" value={u.role} onChange={(e) => update.mutate({ id: u.id, role: e.target.value as Role }, { onSuccess: () => toast(`${u.name} is now ${e.target.value}.`) })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></td>
                <td className="py-2 pr-3"><MarketPicker value={u.markets} onChange={(m) => update.mutate({ id: u.id, markets: m }, { onSuccess: () => toast(`Markets updated for ${u.name}.`) })} /></td>
                <td className="py-2"><input type="checkbox" className="h-4 w-4 accent-[#A8884C]" checked={u.active} onChange={(e) => update.mutate({ id: u.id, active: e.target.checked }, { onSuccess: () => toast(e.target.checked ? `${u.name} activated.` : `${u.name} deactivated.`, 'info') })} aria-label={`Active: ${u.name}`} /></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <ErrorBox error={update.error} className="mt-3" />
      </section>
      <section className="card p-5">
        <div className="eyebrow">Add a person</div>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); create.mutate(form, { onSuccess: () => { toast(`${form.name} added. They sign in with a link to ${form.email}.`); setForm({ email: '', name: '', role: 'requester', markets: 'all' }); } }); }}>
          <div><label className="label">Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Work email</label><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Role</label><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div><label className="label">Markets</label><MarketPicker value={form.markets} onChange={(m) => setForm({ ...form, markets: m })} /></div>
          <div className="md:col-span-2"><ErrorBox error={create.error} /><button className="btn-primary mt-2" disabled={create.isPending}><Plus size={14} /> Add</button></div>
        </form>
        <p className="mt-3 text-xs text-muted">Roles: requester invites and reviews; approver also approves and issues codes; admin manages settings, team, country rules and imports.</p>
      </section>
    </div>
  );
}

function CountryRules({ admin }: { admin: boolean }) {
  const { data, isLoading } = useCountries();
  const save = useSaveCountry();
  const toast = useToast();
  const [code, setCode] = useState<Country>('KSA');
  const [draft, setDraft] = useState<CountryProfile | null>(null);
  useEffect(() => { const p = data?.rows.find((r) => r.code === code); if (p) setDraft(structuredClone(p)); }, [data, code]);
  if (isLoading || !draft) return <Skeleton className="h-96" />;
  const iban = IBAN_SPECS[draft.ibanPrefix];
  const setItem = (i: number, patch: Partial<ChecklistItem>) => setDraft({ ...draft, checklist: draft.checklist.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const move = (i: number, d: -1 | 1) => { const l = [...draft.checklist]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setDraft({ ...draft, checklist: l }); };
  const dirty = JSON.stringify(draft) !== JSON.stringify(data?.rows.find((r) => r.code === code));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">{COUNTRY_ORDER.map((c) => { const p = data?.rows.find((r) => r.code === c); return <button key={c} onClick={() => setCode(c)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${code === c ? 'bg-gold text-white' : 'bg-white text-body hover:bg-cream'}`}>{p?.flag} {p?.name ?? c}</button>; })}</div>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-5"><div className="eyebrow">Identity</div>
          <label className="label mt-3">Registry name</label><input className="input" disabled={!admin} value={draft.registry} onChange={(e) => setDraft({ ...draft, registry: e.target.value })} />
          <label className="label mt-3">Registration number label</label><input className="input" disabled={!admin} value={draft.regLabel} onChange={(e) => setDraft({ ...draft, regLabel: e.target.value })} />
          <label className="label mt-3">Label (Arabic)</label><input className="input" dir="rtl" disabled={!admin} value={draft.regLabelAr} onChange={(e) => setDraft({ ...draft, regLabelAr: e.target.value })} />
          <label className="label mt-3">Example</label><input className="input font-mono" disabled={!admin} value={draft.regExample} onChange={(e) => setDraft({ ...draft, regExample: e.target.value })} />
          <label className="label mt-3">SAP company code</label><input className="input font-mono" disabled={!admin} value={draft.companyCode} onChange={(e) => setDraft({ ...draft, companyCode: e.target.value })} />
        </section>
        <section className="card p-5"><div className="eyebrow">Tax</div>
          <Toggle disabled={!admin} checked={draft.tax.applicable} onChange={(v) => setDraft({ ...draft, tax: { ...draft.tax, applicable: v } })} label="VAT applies" help="When off, the tax number is optional and no VAT certificate is requested." />
          <label className="label">Authority</label><input className="input" disabled={!admin} value={draft.tax.authority} onChange={(e) => setDraft({ ...draft, tax: { ...draft.tax, authority: e.target.value } })} />
          <label className="label mt-3">Field label</label><input className="input" disabled={!admin} value={draft.tax.label} onChange={(e) => setDraft({ ...draft, tax: { ...draft.tax, label: e.target.value } })} />
          <label className="label mt-3">Field label (Arabic)</label><input className="input" dir="rtl" disabled={!admin} value={draft.tax.labelAr} onChange={(e) => setDraft({ ...draft, tax: { ...draft.tax, labelAr: e.target.value } })} />
          <label className="label mt-3">Format description</label><input className="input" disabled={!admin} value={draft.tax.format} onChange={(e) => setDraft({ ...draft, tax: { ...draft.tax, format: e.target.value } })} />
          <label className="label mt-3">Format rule (regular expression)</label><input className="input font-mono text-xs" disabled={!admin} value={String(draft.tax.pattern instanceof RegExp ? draft.tax.pattern.source : (draft.tax.pattern as unknown as string))} onChange={(e) => setDraft({ ...draft, tax: { ...draft.tax, pattern: e.target.value as unknown as RegExp } })} />
          <label className="label mt-3">Example</label><input className="input font-mono" disabled={!admin} value={draft.tax.example} onChange={(e) => setDraft({ ...draft, tax: { ...draft.tax, example: e.target.value } })} />
        </section>
        <section className="card p-5"><div className="eyebrow">Bank</div>
          <div className="mt-3 text-sm text-ink">{iban?.label ?? draft.ibanPrefix}</div><div className="text-xs text-muted">ISO 13616 mod-97, validated instantly on the vendor side</div>
          <label className="label mt-3">Bank letter age limit (months)</label><input className="input" type="number" min={1} max={24} disabled={!admin} value={draft.bankLetterMaxMonths} onChange={(e) => setDraft({ ...draft, bankLetterMaxMonths: Number(e.target.value) })} />
          <label className="label mt-3">Notes for the team</label><textarea className="input min-h-[120px] text-sm" disabled={!admin} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </section>
      </div>
      <section className="card p-5">
        <div className="flex items-center justify-between"><div className="eyebrow">Document checklist · {draft.checklist.length} items</div>{admin && <button className="btn-secondary !py-1 text-xs" onClick={() => setDraft({ ...draft, checklist: [...draft.checklist, { id: `custom-${Date.now().toString(36)}`, label: 'New document', labelAr: 'مستند جديد', docType: 'other' }] })}><Plus size={13} /> Add item</button>}</div>
        <ol className="mt-3 space-y-2">{draft.checklist.map((it, i) => (
          <li key={it.id} className="grid gap-2 rounded-xl border border-champagne/50 p-3 md:grid-cols-[auto_1fr_1fr_auto]">
            <div className="flex items-center gap-1 text-xs text-muted"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-cream text-[11px] font-semibold text-gold-deep">{i + 1}</span>{admin && <><button className="rounded p-1 hover:bg-greige" onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={12} /></button><button className="rounded p-1 hover:bg-greige" onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={12} /></button></>}</div>
            <div className="space-y-1"><input className="input !py-1.5 text-sm" disabled={!admin} value={it.label} onChange={(e) => setItem(i, { label: e.target.value })} aria-label="Label" /><input className="input !py-1.5 text-xs" disabled={!admin} value={it.hint ?? ''} placeholder="Hint (optional)" onChange={(e) => setItem(i, { hint: e.target.value })} /></div>
            <div className="space-y-1"><input className="input !py-1.5 text-sm" dir="rtl" disabled={!admin} value={it.labelAr} onChange={(e) => setItem(i, { labelAr: e.target.value })} aria-label="Label (Arabic)" /><input className="input !py-1.5 text-xs" dir="rtl" disabled={!admin} value={it.hintAr ?? ''} placeholder="تلميح (اختياري)" onChange={(e) => setItem(i, { hintAr: e.target.value })} /></div>
            <div className="flex items-start gap-2"><select className="input !w-auto !py-1.5 text-xs" disabled={!admin} value={it.docType} onChange={(e) => setItem(i, { docType: e.target.value })}>{['registration-form', 'cr', 'trade-licence', 'commercial-register', 'vat', 'tax-card', 'bank-letter', 'quotation', 'e-invoice', 'other'].map((t) => <option key={t}>{t}</option>)}</select>{admin && <button className="rounded p-1.5 text-fail hover:bg-fail-bg" onClick={() => setDraft({ ...draft, checklist: draft.checklist.filter((_, j) => j !== i) })} aria-label="Remove"><Trash2 size={14} /></button>}</div>
          </li>
        ))}</ol>
        {admin && <div className="mt-4 flex items-center justify-end gap-2"><ErrorBox error={save.error} />{dirty && <span className="text-xs text-muted">Unsaved changes</span>}<button className="btn-primary" disabled={!dirty || save.isPending} onClick={() => save.mutate(draft, { onSuccess: () => toast(`${draft.name} rules saved. The vendor checklist updates immediately.`) })}><Save size={14} /> Save {draft.name}</button></div>}
      </section>
    </div>
  );
}

function SapImport() {
  const imp = useSapImport();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const template = 'code,name,name_ar,country,reg_number,vat_number,iban\n400101,Example Vendor Co.,شركة مثال,KSA,1010000000,300000000000003,SA0000000000000000000000\n';
  return (
    <section className="card p-5">
      <div className="eyebrow">SAP vendor import</div>
      <p className="mt-2 text-sm text-body">Upload the SAP vendor master as CSV. Existing codes are updated, new codes added. Columns: <code className="rounded bg-greige px-1 text-xs">code, name, name_ar, country, reg_number, vat_number, iban</code>. <a className="text-gold-deep underline" href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`} download="sap-vendors-template.csv">Download template</a></p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" aria-label="CSV file" />
        <button className="btn-primary" disabled={!file || imp.isPending} onClick={() => file && imp.mutate(file, { onSuccess: (r) => { toast(`Imported ${r.imported} vendors, skipped ${r.skipped}.`); setFile(null); } })}><Upload size={14} /> Import</button>
      </div>
      {imp.data && <div className="mt-3 rounded-xl bg-pass-bg p-3 text-sm text-pass">Imported {imp.data.imported} · skipped {imp.data.skipped}</div>}
      <ErrorBox error={imp.error} className="mt-3" />
    </section>
  );
}

function About({ me }: { me: Me }) {
  return (
    <section className="card p-5">
      <div className="eyebrow">About</div>
      <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        <div><dt className="text-[11px] text-muted">Product</dt><dd className="text-ink">MAGRABi Vendor Hub</dd></div>
        <div><dt className="text-[11px] text-muted">Mode</dt><dd className="text-ink">{me.mode === 'demo' ? 'Demo · sample data, simulated registries' : 'Live'}</dd></div>
        <div><dt className="text-[11px] text-muted">Signed in as</dt><dd className="text-ink">{me.user.name} · {me.user.role}</dd></div>
        <div><dt className="text-[11px] text-muted">Principle</dt><dd className="text-ink">AI reads. Rules check. Registries confirm. A person decides.</dd></div>
      </dl>
    </section>
  );
}
