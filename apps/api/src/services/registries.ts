// Registry adapters. Real connections when keys exist, simulated in demo mode, otherwise "manual" (a person confirms).
import { COUNTRIES, findDuplicates, MATCH_LABELS, type CompanyInfo, type Country, type RegistryCheck, type Vendor } from '@vendorhub/shared';
import { config } from '../config.js';
import { addAudit, getCountryProfile, getVendor, listSapVendors, putRegistryCheck, type DB } from '../db/index.js';
import { SAMPLE_COMPANIES, SAP_VENDORS, sampleForCountry } from './demoData.js';
import { nowIso } from '../lib/time.js';
import { log } from '../lib/log.js';

export interface LookupResult { found: boolean; registry: string; provider: 'wathq' | 'simulated' | 'manual'; company?: Partial<CompanyInfo>; latencyMs: number }

const wait = (min: number, max: number) => new Promise((r) => setTimeout(r, Math.round(min + Math.random() * (max - min))));

/** Company registry lookup by registration number. Wathq is the only live adapter today. */
export async function lookupCompany(country: Country, regNumber: string): Promise<LookupResult> {
  const registry = COUNTRIES[country].registry;
  const started = Date.now();
  const clean = regNumber.trim().toUpperCase();
  if (country === 'KSA' && config.wathq.key) {
    try {
      const res = await fetch(`${config.wathq.baseUrl}/commercialregistration/fullinfo/${encodeURIComponent(clean)}`, { headers: { apiKey: config.wathq.key, accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (res.status === 404) return { found: false, registry, provider: 'wathq', latencyMs: Date.now() - started };
      if (!res.ok) throw new Error(`Wathq ${res.status}`);
      const j = (await res.json()) as Record<string, unknown>;
      const str = (k: string) => (typeof j[k] === 'string' ? (j[k] as string) : '');
      const status = (j.status as { name?: string } | undefined)?.name ?? str('status');
      const address = (j.address as { general?: { address?: string; city?: string } } | undefined)?.general;
      return { found: true, registry, provider: 'wathq', latencyMs: Date.now() - started, company: { regNumber: str('crNumber') || clean, legalName: str('crName'), legalNameAr: str('crName'), regStatus: status || 'Active', issueDate: str('issueDate'), expiryDate: str('expiryDate'), city: address?.city ?? '', address: address?.address ?? '', verifiedBy: 'Wathq', verifiedAt: nowIso() } };
    } catch (err) {
      log.warn({ err }, 'Wathq lookup failed; falling back to manual');
      return { found: false, registry, provider: 'manual', latencyMs: Date.now() - started };
    }
  }
  if (config.mode === 'demo') {
    await wait(500, 1200);
    const hit = Object.values(SAMPLE_COMPANIES).find((c) => c.country === country && c.company.regNumber.toUpperCase() === clean);
    if (hit) return { found: true, registry, provider: 'simulated', latencyMs: Date.now() - started, company: { ...hit.company, verifiedBy: registry, verifiedAt: nowIso() } };
    const sap = SAP_VENDORS.find((v) => v.country === country && v.regNumber.toUpperCase() === clean);
    if (sap) return { found: true, registry, provider: 'simulated', latencyMs: Date.now() - started, company: { regNumber: sap.regNumber, legalName: sap.name, legalNameAr: sap.nameAr ?? '', regStatus: 'Active', issueDate: '2020-01-15', expiryDate: '2028-01-14', city: sampleForCountry(country).company.city, address: 'Sample address', verifiedBy: registry, verifiedAt: nowIso() } };
    return { found: false, registry, provider: 'simulated', latencyMs: Date.now() - started };
  }
  return { found: false, registry, provider: 'manual', latencyMs: 0 };
}

type CheckOut = Pick<RegistryCheck, 'provider' | 'status' | 'summary' | 'detail'>;

export async function checkTax(country: Country, vatNumber: string, db?: DB): Promise<CheckOut> {
  const t = db ? getCountryProfile(db, country).tax : COUNTRIES[country].tax;
  if (!t.applicable) return { provider: 'rules', status: vatNumber ? 'pass' : 'pass', summary: vatNumber ? `${t.authority}: tax number recorded (no VAT regime)` : 'No VAT regime in this market' };
  if (!vatNumber) return { provider: 'rules', status: 'fail', summary: `${t.authority}: tax number missing` };
  const clean = vatNumber.replace(/[\s-]/g, '');
  if (!t.pattern.test(clean)) return { provider: 'rules', status: 'fail', summary: `${t.authority}: format invalid (${t.format})` };
  if (config.mode === 'demo') {
    await wait(400, 900);
    const known = Object.values(SAMPLE_COMPANIES).some((c) => c.tax.vatNumber.replace(/[\s-]/g, '') === clean) || SAP_VENDORS.some((v) => v.vatNumber.replace(/[\s-]/g, '') === clean);
    return known ? { provider: 'simulated', status: 'pass', summary: `${t.authority} (simulated): ${vatNumber} active` } : { provider: 'simulated', status: 'flag', summary: `${t.authority} (simulated): ${vatNumber} not found` };
  }
  return { provider: 'manual', status: 'manual', summary: `${t.authority}: not connected · format valid, confirm on the authority portal` };
}

export async function screenSanctions(legalName: string): Promise<CheckOut> {
  if (config.mode === 'demo') {
    await wait(600, 1200);
    return { provider: 'simulated', status: 'pass', summary: 'Clear · UN, OFAC, EU and local lists (simulated)' };
  }
  return { provider: 'manual', status: 'manual', summary: `Not connected · screen "${legalName}" manually and record the result in a note` };
}

export function duplicateCheck(db: DB, v: Vendor): CheckOut {
  const sap = listSapVendors(db);
  const d = findDuplicates(v, sap)[0];
  if (!d) return { provider: 'sap-list', status: 'pass', summary: `No match in SAP vendor list (${sap.length} vendors)` };
  return { provider: 'sap-list', status: 'flag', summary: `Possible match: SAP vendor ${d.sap.code} "${d.sap.name}" · same ${d.on.map((m) => MATCH_LABELS[m]).join(' and ')}`, detail: JSON.stringify(d.on) };
}

/** After submit (and on re-check): company registry, tax, duplicate, sanctions. Writes rows + audit. */
export async function runPostSubmitChecks(db: DB, vendorId: string): Promise<RegistryCheck[]> {
  const v = getVendor(db, vendorId);
  if (!v) return [];
  const out: RegistryCheck[] = [];
  const reg = await lookupCompany(v.country, v.company.regNumber);
  const regStatus: RegistryCheck['status'] = reg.provider === 'manual' ? 'manual' : reg.found ? 'pass' : 'flag';
  const regSummary = reg.provider === 'manual' ? `${reg.registry}: not connected · confirm ${v.company.regNumber} on the registry portal` : reg.found ? `${reg.registry}${reg.provider === 'simulated' ? ' (simulated)' : ''}: ${v.company.regNumber} ${(reg.company?.regStatus ?? 'active').toLowerCase()}, expires ${reg.company?.expiryDate ?? '—'}` : `${reg.registry}${reg.provider === 'simulated' ? ' (simulated)' : ''}: ${v.company.regNumber} not found · flagged for review`;
  out.push(putRegistryCheck(db, { vendorId, kind: 'company', provider: reg.provider, status: regStatus, summary: regSummary, checkedAt: nowIso() }));
  addAudit(db, vendorId, 'System', 'registry', regSummary, `${reg.latencyMs} ms`);

  const tax = await checkTax(v.country, v.tax.vatNumber, db);
  out.push(putRegistryCheck(db, { vendorId, kind: 'tax', ...tax, checkedAt: nowIso() }));
  addAudit(db, vendorId, 'System', 'registry', tax.summary);

  const dup = duplicateCheck(db, v);
  out.push(putRegistryCheck(db, { vendorId, kind: 'duplicate', ...dup, checkedAt: nowIso() }));
  addAudit(db, vendorId, 'System', 'rule', dup.status === 'flag' ? `Duplicate check: FLAG · ${dup.summary}` : `Duplicate check: ${dup.summary}`);

  const sanc = await screenSanctions(v.company.legalName || v.name);
  out.push(putRegistryCheck(db, { vendorId, kind: 'sanctions', ...sanc, checkedAt: nowIso() }));
  addAudit(db, vendorId, 'registry' === 'registry' ? 'System' : 'System', 'registry', `Sanctions screen: ${sanc.summary}`);
  return out;
}
