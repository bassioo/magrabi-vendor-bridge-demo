// Document reading. Claude vision when a key exists; the sample catalogue in demo mode; otherwise "needs review".
import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { runDocChecks, worstLevel, type ChecklistItem, type DocumentRecord, type ExtractionResult, type Vendor } from '@vendorhub/shared';
import { config } from '../config.js';
import { addAudit, getSettings, insertDocument, type DB } from '../db/index.js';
import { defaultSampleKey, resolveSampleKey, SAMPLE_DOCS, toExtraction } from './demoCatalogue.js';
import { sampleForVendor } from './demoData.js';
import { log } from '../lib/log.js';
import { nowIso } from '../lib/time.js';

export const AI_LABEL = () => `Claude (${config.anthropicModel})`;
export const DEMO_LABEL = 'Demo recognition v1';

interface StoredFile { path: string; fileName: string; mimeType: string; sizeBytes: number; storageKey: string }

const anthropic = config.anthropicKey ? new Anthropic({ apiKey: config.anthropicKey }) : null;

async function extractWithClaude(file: StoredFile, slot: ChecklistItem): Promise<ExtractionResult | null> {
  if (!anthropic) return null;
  try {
    const data = fs.readFileSync(file.path).toString('base64');
    const block = file.mimeType === 'application/pdf'
      ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data } }
      : { type: 'image' as const, source: { type: 'base64' as const, media_type: file.mimeType as 'image/png' | 'image/jpeg', data } };
    const response = await anthropic.messages.create({
      model: config.anthropicModel,
      max_tokens: 2048,
      system: 'You read vendor onboarding documents for a procurement team. Answer with ONE strict JSON object and nothing else: {"docType": string, "legible": boolean, "stamped": boolean, "issuedDate": "YYYY-MM-DD" | null, "expiryDate": "YYYY-MM-DD" | null, "fields": {string: string}}. docType must be one of: registration-form, cr, trade-licence, commercial-register, vat, tax-card, e-invoice, bank-letter, quotation, invoice, unknown. "stamped" is true when a stamp OR a handwritten signature is visible. "fields" holds the visible identifiers exactly as printed with English keys (Legal name, Legal name (AR), Registration number, VAT number, TRN, IBAN, Account holder, Bank, Issue date, Expiry date, City, Signed by). Use "Legal name" for the company name.',
      messages: [{ role: 'user', content: [block, { type: 'text', text: `Expected document: ${slot.label} (${slot.docType}). Extract.` }] }],
    });
    if (response.stop_reason === 'refusal') return null;
    const text = response.content.filter((b) => b.type === 'text').map((b) => (b.type === 'text' ? b.text : '')).join('');
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<string, unknown>;
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries((json.fields as Record<string, unknown>) ?? {})) if (v !== null && typeof v !== 'object') fields[k] = String(v);
    return { docType: String(json.docType ?? 'unknown'), legible: json.legible !== false, stamped: json.stamped === true, issuedDate: typeof json.issuedDate === 'string' ? json.issuedDate : undefined, expiryDate: typeof json.expiryDate === 'string' ? json.expiryDate : undefined, fields, confidence: 0.9 };
  } catch (err) {
    log.warn({ err }, 'Claude extraction failed; falling back');
    return null;
  }
}

function extractFromCatalogue(file: StoredFile, slot: ChecklistItem, vendor: Vendor): ExtractionResult {
  const company = sampleForVendor(vendor);
  const key = resolveSampleKey(file.fileName, company.key) ?? defaultSampleKey(company.key, slot.id);
  const sample = SAMPLE_DOCS[key] ?? SAMPLE_DOCS['sample-unstamped'];
  const vendorFields = vendor.company.legalName ? vendor : { ...vendor, company: company.company, tax: company.tax, bank: company.bank, contacts: company.contacts };
  return toExtraction(sample, vendorFields, company);
}

/** Reads a stored file, runs the instant checks, stores the document (replacing the slot's current version) and logs it. */
export async function processUpload(db: DB, vendor: Vendor, slot: ChecklistItem, file: StoredFile, actor = 'Vendor'): Promise<DocumentRecord> {
  const { bankLetterMaxMonths } = getSettings(db);
  let result: ExtractionResult | null = null;
  let source: DocumentRecord['extractionSource'] = 'none';
  let model: string | undefined;
  result = await extractWithClaude(file, slot);
  if (result) { source = 'ai'; model = AI_LABEL(); }
  else if (config.mode === 'demo') { result = extractFromCatalogue(file, slot, vendor); source = 'demo'; model = DEMO_LABEL; }
  else result = { docType: 'unknown', legible: true, stamped: true, fields: {} };
  if (slot.docType === 'other' && result.docType !== 'unknown') result.docType = 'any'; // custom checklist items accept any document type
  const checks = runDocChecks(slot, result, bankLetterMaxMonths);
  const doc = insertDocument(db, { vendorId: vendor.id, slotId: slot.id, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, storageKey: file.storageKey, uploadedAt: nowIso(), extracted: result.fields, extractionSource: source, extractionModel: model, checks, level: worstLevel(checks.map((c) => c.level)) });
  addAudit(db, vendor.id, actor, 'upload', `Uploaded ${slot.label.toLowerCase()} · ${file.fileName}`, `${Math.round(file.sizeBytes / 1024)} KB · version ${doc.version}`);
  if (source !== 'none') addAudit(db, vendor.id, 'System', 'ai', `${model}: read ${slot.label.toLowerCase()} · ${Object.keys(result.fields).join(', ') || 'no fields'}`, result.issuedDate ? `Issue date ${result.issuedDate.slice(0, 10)}` : undefined);
  else addAudit(db, vendor.id, 'System', 'ai', `No document reader configured · ${slot.label.toLowerCase()} marked for manual review`);
  const failed = checks.filter((c) => c.level === 'fail');
  if (failed.length) addAudit(db, vendor.id, 'System', 'rule', `${slot.label} FAILED ${failed.length === 1 ? 'a check' : `${failed.length} checks`} · vendor told instantly`, failed.map((c) => c.reason).join(' '));
  else addAudit(db, vendor.id, 'System', 'rule', `${slot.label} passed all ${checks.length} checks${checks.some((c) => c.level === 'flag') ? ' (with items for a person to confirm)' : ''}`);
  return doc;
}
