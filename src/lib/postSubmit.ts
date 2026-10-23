import type { StoreApi } from '@/app/store';
import { registryLookup, taxRegistryCheck, sanctionsScreen } from './mockRegistries';
import { findDuplicates, MATCH_LABELS } from './duplicates';

/** Runs the after-submit registry, duplicate and sanctions checks and writes each result to the audit trail. */
export async function runPostSubmitChecks(store: StoreApi, vendorId: string): Promise<void> {
  const v = store.getVendor(vendorId);
  if (!v) return;
  const reg = await registryLookup(v.country, v.company.regNumber);
  store.audit(vendorId, 'System', 'registry', reg.found ? `${reg.registry} (simulated): ${v.company.regNumber} ${reg.status?.toLowerCase()}, expires ${reg.expiryDate}` : `${reg.registry} (simulated): ${v.company.regNumber} not found · flagged for review`, `${reg.latencyMs} ms`);
  const tax = await taxRegistryCheck(v.country, v.tax.vatNumber);
  store.audit(vendorId, 'System', 'registry', `${tax.authority} (simulated): ${v.tax.vatNumber} ${tax.status === 'active' ? 'active' : 'not found · flagged for review'}`, `${tax.latencyMs} ms`);
  const dups = findDuplicates(v, store.state.sapVendors);
  if (dups.length) {
    const d = dups[0];
    store.audit(vendorId, 'System', 'rule', `Duplicate check: FLAG · SAP vendor ${d.sap.code} "${d.sap.name}" shares ${d.on.map((m) => MATCH_LABELS[m]).join(', ')}`);
  } else store.audit(vendorId, 'System', 'rule', `Duplicate check: no match in SAP vendor list (${store.state.sapVendors.length} vendors)`);
  const s = await sanctionsScreen(v.company.legalName);
  store.audit(vendorId, 'System', 'registry', `Sanctions screen (simulated): ${s.status} · ${s.lists.length} lists`, `${s.latencyMs} ms`);
}
