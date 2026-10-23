// All registry calls are SIMULATED. They wait a realistic 600–1500 ms and answer from a small fictional table.
import type { Country } from './types';
import { SAP_VENDORS } from '@/data/sapVendors';
import { SAMPLE_COMPANIES, sampleForCountry } from './sampleCompanies';
import { COUNTRIES } from '@/data/countries';

export const SIMULATED = 'simulated';

export function wait(min = 600, max = 1500): Promise<void> {
  const ms = Math.round(min + Math.random() * (max - min));
  return new Promise((r) => setTimeout(r, ms));
}

export interface RegistryResult {
  found: boolean;
  registry: string;
  legalName?: string;
  legalNameAr?: string;
  status?: string;
  issueDate?: string;
  expiryDate?: string;
  city?: string;
  address?: string;
  latencyMs: number;
}

/** Mocked Wathq (KSA) / DED (UAE) / GAFI (EG) lookup by registration number. */
export async function registryLookup(country: Country, regNumber: string): Promise<RegistryResult> {
  const started = performance.now();
  await wait();
  const latencyMs = Math.round(performance.now() - started);
  const registry = COUNTRIES[country].registry;
  const clean = (regNumber || '').trim().toUpperCase();
  const generic = sampleForCountry(country);
  const sample = Object.values(SAMPLE_COMPANIES).find((c) => c.country === country && c.company.regNumber.toUpperCase() === clean) ?? (generic.company.regNumber.toUpperCase() === clean ? generic : undefined);
  if (sample) {
    const c = sample.company;
    return { found: true, registry, legalName: c.legalName, legalNameAr: c.legalNameAr, status: c.regStatus, issueDate: c.issueDate, expiryDate: c.expiryDate, city: c.city, address: c.address, latencyMs };
  }
  const existing = SAP_VENDORS.find((v) => v.country === country && v.regNumber.toUpperCase() === clean);
  if (existing) {
    return { found: true, registry, legalName: existing.name, legalNameAr: existing.nameAr ?? '', status: 'Active', issueDate: '2020-01-15', expiryDate: '2028-01-14', city: generic.company.city, address: 'Sample address', latencyMs };
  }
  return { found: false, registry, latencyMs };
}

export interface TaxRegistryResult {
  authority: string;
  status: 'active' | 'not_found';
  latencyMs: number;
}

/** Mocked ZATCA (KSA) / FTA (UAE) / ETA (EG) tax number check. */
export async function taxRegistryCheck(country: Country, vatNumber: string): Promise<TaxRegistryResult> {
  const started = performance.now();
  await wait();
  const latencyMs = Math.round(performance.now() - started);
  const authority = COUNTRIES[country].tax.authority;
  const clean = (vatNumber || '').replace(/[\s-]/g, '');
  const known =
    Object.values(SAMPLE_COMPANIES).some((c) => c.tax.vatNumber.replace(/[\s-]/g, '') === clean) ||
    sampleForCountry(country).tax.vatNumber.replace(/[\s-]/g, '') === clean ||
    SAP_VENDORS.some((v) => v.vatNumber.replace(/[\s-]/g, '') === clean);
  return { authority, status: known ? 'active' : 'not_found', latencyMs };
}

export interface SanctionsResult {
  status: 'clear';
  lists: string[];
  latencyMs: number;
}

/** Mocked sanctions screen. Always clear in the demo. */
export async function sanctionsScreen(_name: string): Promise<SanctionsResult> {
  const started = performance.now();
  await wait(900, 1500);
  return { status: 'clear', lists: ['UN consolidated', 'OFAC SDN', 'EU consolidated', 'Local lists'], latencyMs: Math.round(performance.now() - started) };
}
