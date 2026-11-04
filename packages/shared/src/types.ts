// Shared domain types for MAGRABi Vendor Hub (web + api).
export type Country = 'KSA' | 'UAE' | 'EG' | 'KW' | 'QA' | 'BH' | 'OM';
export type Lang = 'en' | 'ar';
export type CheckLevel = 'pass' | 'flag' | 'fail' | 'pending';
export type FieldSource = 'official' | 'ai' | 'manual' | 'review';
export type Role = 'admin' | 'approver' | 'requester';

export type VendorStatus = 'invited' | 'draft' | 'submitted' | 'in_review' | 'returned' | 'approved' | 'code_issued' | 'rejected' | 'expired';

export interface Contact { name: string; email: string; phone: string }

export interface CompanyInfo {
  regNumber: string;
  legalName: string;
  legalNameAr: string;
  regStatus: string;
  issueDate: string;
  expiryDate: string;
  city: string;
  address: string;
  verifiedBy?: string; // registry name when confirmed by an official lookup
  verifiedAt?: string;
}

export interface TaxInfo { vatNumber: string; verifiedBy?: string; verifiedAt?: string }
export interface BankInfo { iban: string; bankName: string; accountHolder: string; swift?: string }

export interface DocCheck {
  id: 'type' | 'legible' | 'stamp' | 'date';
  level: CheckLevel;
  label: string;
  labelAr: string;
  reason: string;
  reasonAr: string;
}

export interface DocumentRecord {
  id: string;
  vendorId: string;
  slotId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedAt: string;
  extracted: Record<string, string>;
  extractionSource: 'ai' | 'demo' | 'none';
  extractionModel?: string;
  checks: DocCheck[];
  level: CheckLevel;
  version: number;
}

export interface AuditEntry {
  id: string;
  vendorId: string;
  at: string;
  actor: string;
  kind: 'upload' | 'ai' | 'rule' | 'registry' | 'review' | 'system' | 'email';
  message: string;
  detail?: string;
}

export interface Note { id: string; vendorId: string; at: string; by: string; text: string }

export interface ReturnNote { en: string; ar: string; sentAt: string; by: string; items: string[] }

export interface Vendor {
  id: string;
  email: string;
  country: Country;
  category: string;
  status: VendorStatus;
  name: string;
  lang: Lang;
  stage: 'welcome' | 'form' | 'documents' | 'review' | 'status';
  formStep: number;
  invitedBy: string;
  invitedAt: string;
  inviteExpiresAt: string;
  submittedAt?: string;
  reviewStartedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  codeIssuedAt?: string;
  vendorCode?: string;
  assignee?: string;
  returnCount: number;
  firstTimeRight?: boolean;
  bankIsNew: boolean;
  callbackConfirmedBy?: string;
  callbackConfirmedAt?: string;
  company: CompanyInfo;
  tax: TaxInfo;
  bank: BankInfo;
  contacts: { sales: Contact; ar: Contact };
  returnNote?: ReturnNote;
  // populated by the API on detail endpoints
  documents?: DocumentRecord[];
  audit?: AuditEntry[];
  notes?: Note[];
  registryChecks?: RegistryCheck[];
}

export interface RegistryCheck {
  id: string;
  vendorId: string;
  kind: 'company' | 'tax' | 'sanctions' | 'duplicate';
  provider: string; // 'Wathq', 'manual', 'simulated', 'sap-list'
  status: 'pass' | 'flag' | 'fail' | 'pending' | 'manual';
  summary: string;
  detail?: string;
  checkedAt: string;
}

export interface SapVendor {
  code: string;
  name: string;
  nameAr?: string;
  country: Country;
  regNumber: string;
  vatNumber: string;
  iban: string;
  createdAt: string;
  source: 'import' | 'issued';
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  markets: Country[] | 'all';
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Settings {
  requireCallback: boolean;
  segregationOfDuties: boolean;
  autoAssign: boolean;
  bankLetterMaxMonths: number;
  inviteValidDays: number;
  reminderAfterDays: number;
  slaReviewDays: number;
}

export const DEFAULT_SETTINGS: Settings = {
  requireCallback: true,
  segregationOfDuties: true,
  autoAssign: true,
  bankLetterMaxMonths: 6,
  inviteValidDays: 30,
  reminderAfterDays: 3,
  slaReviewDays: 2,
};

export interface Email {
  id: string;
  at: string;
  to: string;
  vendorId?: string;
  kind: 'invite' | 'reminder' | 'submitted' | 'returned' | 'approved' | 'code_issued' | 'magic_link' | 'rejected';
  subject: string;
  bodyEn: string;
  bodyAr: string;
  delivery: 'smtp' | 'outbox';
  deliveredAt?: string;
  error?: string;
}

export interface ReviewCheck {
  id: 'iban' | 'holder' | 'names' | 'expiry' | 'bankLetter' | 'duplicate' | 'sanctions' | 'registry' | 'tax';
  label: string;
  level: CheckLevel;
  reason: string;
  simulated?: boolean;
  fixEn?: string;
  fixAr?: string;
}

export interface ReviewSummary {
  checks: ReviewCheck[];
  passed: number;
  flags: number;
  fails: number;
  docsPassed: number;
  docsTotal: number;
}
