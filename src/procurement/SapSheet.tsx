import { useState } from 'react';
import { Copy, Download, Check, KeyRound } from 'lucide-react';
import { useStore } from '@/app/store';
import { useToast } from '@/components/Toast';
import type { Vendor } from '@/lib/types';
import { normaliseIban } from '@/lib/iban';
import { COUNTRIES } from '@/data/countries';

export function sapRows(v: Vendor): [string, string][] {
  const companyCode = COUNTRIES[v.country].companyCode;
  return [
    ['Account group', 'ZVND'],
    ['Company code', companyCode],
    ['Purchasing organisation', '1000'],
    ['Name 1', v.company.legalName],
    ['Name 2 (Arabic)', v.company.legalNameAr],
    ['Search term', v.company.legalName.split(' ').slice(0, 2).join(' ').toUpperCase()],
    ['Street / house number', v.company.address],
    ['City', v.company.city],
    ['Country', COUNTRIES[v.country].ibanPrefix],
    ['Registration number', v.company.regNumber],
    ['Tax number 1', v.tax.vatNumber || 'n/a'],
    ['Currency', COUNTRIES[v.country].currency],
    ['Bank country', normaliseIban(v.bank.iban).slice(0, 2)],
    ['Bank key', normaliseIban(v.bank.iban).slice(4, 4 + ({ SA: 2, AE: 3, EG: 4, KW: 4, QA: 4, BH: 4, OM: 3 }[COUNTRIES[v.country].ibanPrefix] ?? 4))],
    ['IBAN', normaliseIban(v.bank.iban)],
    ['Account holder', v.bank.accountHolder],
    ['Bank name', v.bank.bankName],
    ['Payment terms', 'Z060 (60 days net)'],
    ['Payment method', 'T (bank transfer)'],
    ['Reconciliation account', '210000'],
    ['AR contact', `${v.contacts.ar.name} · ${v.contacts.ar.email} · ${v.contacts.ar.phone}`],
  ];
}

export function SapSheet({ vendor }: { vendor: Vendor }) {
  const store = useStore();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState(vendor.vendorCode ?? '');
  const ready = vendor.status === 'approved' || vendor.status === 'code_issued';
  const rows = sapRows(vendor);

  const copyAll = async () => {
    try { await navigator.clipboard.writeText(rows.map(([k, v]) => `${k}\t${v}`).join('\n')); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    store.audit(vendor.id, store.currentUser, 'review', 'Copied SAP keying sheet');
    toast('SAP keying sheet copied to clipboard.');
  };
  const csv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const body = ['Field,Value', ...rows.map(([k, v]) => `${esc(k)},${esc(v)}`)].join('\n');
    const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sap-keying-${(vendor.company.legalName || 'vendor').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    store.audit(vendor.id, store.currentUser, 'review', 'Downloaded SAP keying sheet (CSV)');
  };
  const issue = () => {
    const at = new Date().toISOString();
    store.update(vendor.id, (v) => ({ ...v, status: 'code_issued', codeIssuedAt: at, vendorCode: code.trim(), bankIsNew: false }));
    store.addSap({ code: code.trim(), name: vendor.company.legalName, nameAr: vendor.company.legalNameAr, country: vendor.country, regNumber: vendor.company.regNumber, vatNumber: vendor.tax.vatNumber, iban: normaliseIban(vendor.bank.iban), createdAt: at.slice(0, 10) });
    store.audit(vendor.id, store.currentUser, 'system', `Vendor code ${code.trim()} issued · vendor notified (simulated email) · added to SAP vendor list`);
    store.email(vendor.id, 'code_issued', `MAGRABi · Your vendor code is ${code.trim()}`, `Welcome aboard. Your MAGRABi vendor code is ${code.trim()}. Please quote it on every quotation and invoice. Payment terms: 60 days net, by bank transfer to the account you registered.`, `أهلًا بكم معنا. رمز المورّد الخاص بكم في مغربي هو ${code.trim()}. يرجى ذكره في كل عرض سعر وفاتورة. شروط الدفع: 60 يومًا صافي، بالتحويل البنكي إلى الحساب المسجّل.`);
    toast(`Vendor code ${code.trim()} issued. Vendor notified (simulated).`);
  };

  if (!ready) {
    return <div className="card mt-6 p-8 text-center text-sm text-muted">The SAP keying sheet becomes available once the vendor is approved.</div>;
  }
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-greige px-5 py-3">
          <div>
            <div className="eyebrow">SAP keying sheet</div>
            <div className="text-xs text-muted">Fields in SAP entry order. Codes are placeholders for the demo.</div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary !py-1.5 text-xs" onClick={copyAll}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy all'}</button>
            <button className="btn-secondary !py-1.5 text-xs" onClick={csv}><Download size={14} /> Download CSV</button>
          </div>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-t border-greige first:border-0">
                <td className="w-56 px-5 py-2 text-xs text-muted">{k}</td>
                <td className="px-5 py-2 font-mono text-[13px] text-ink">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card h-fit p-5">
        <div className="eyebrow">Vendor code issued</div>
        <p className="mt-1 text-xs text-muted">Once the vendor is keyed into SAP, enter the code here. The vendor is notified and the record is closed.</p>
        {vendor.status === 'code_issued' ? (
          <div className="mt-4 rounded-xl bg-pass-bg p-4 text-sm text-pass"><Check size={14} className="mr-1 inline" /> Vendor code <span className="font-mono font-semibold">{vendor.vendorCode}</span> issued. Vendor notified (simulated).</div>
        ) : (
          <div className="mt-4 flex gap-2">
            <input className="input font-mono" placeholder="e.g. 400116" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn-primary shrink-0" disabled={code.trim().length < 4} onClick={issue}><KeyRound size={14} /> Issue</button>
          </div>
        )}
        <div className="mt-5 border-t border-greige pt-4 text-xs text-muted">
          Approved by {vendor.approvedBy}. Invited by {vendor.invitedBy}. Bank details confirmed by call-back.
        </div>
      </div>
    </div>
  );
}
