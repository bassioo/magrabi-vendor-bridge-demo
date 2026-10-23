export type Country = 'KSA' | 'UAE' | 'EG' | 'KW' | 'QA' | 'BH' | 'OM';
export type Lang = 'en' | 'ar';
export type CheckLevel = 'pass' | 'flag' | 'fail' | 'pending';
export type FieldSource = 'official' | 'ai' | 'review';

export type VendorStatus =
  | 'invited'
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'returned'
  | 'approved'
  | 'code_issued';

export interface Contact {
  name: string;
  email: string;
  phone: string;
}

export interface CompanyInfo {
  regNumber: string; // CR / trade licence / commercial register number
  legalName: string;
  legalNameAr: string;
  regStatus: string;
  issueDate: string; // ISO date
  expiryDate: string; // ISO date
  city: string;
  address: string;
  verifiedBy?: string; // simulated registry name, e.g. 'Wathq'
}

export interface TaxInfo {
  vatNumber: string;
}

export interface BankInfo {
  iban: string;
  bankName: string;
  accountHolder: string;
}

export interface DocCheck {
  id: 'type' | 'legible' | 'stamp' | 'date';
  level: CheckLevel;
  label: string;
  labelAr: string;
  reason: string;
  reasonAr: string;
}

export interface UploadedDoc {
  slotId: string;
  fileName: string;
  sampleKey: string; // which pre-canned result was used
  image: string; // path under /samples
  uploadedAt: string;
  checks: DocCheck[];
  extracted: Record<string, string>;
  level: CheckLevel; // overall
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string; // "Vendor", "Hana (Requester)", "Deena (Approver)", "System"
  kind: 'upload' | 'ai' | 'rule' | 'registry' | 'review' | 'system';
  message: string;
  detail?: string;
}

export interface ReturnNote {
  en: string;
  ar: string;
  sentAt: string;
  by: string;
  items: string[];
}

export interface Note {
  id: string;
  at: string;
  by: string;
  text: string;
}

export type EmailKind = 'invite' | 'submitted' | 'returned' | 'approved' | 'code_issued' | 'reminder';

export interface Email {
  id: string;
  at: string;
  to: string;
  vendorId: string;
  kind: EmailKind;
  subject: string;
  bodyEn: string;
  bodyAr: string;
}

export interface Settings {
  requireCallback: boolean; // bank details must be confirmed by call-back before approval
  segregationOfDuties: boolean; // requester cannot approve
  bankLetterMaxMonths: number;
  autoAssign: boolean; // opening a review assigns it to you
}

export interface Vendor {
  id: string;
  assignee?: string;
  notes: Note[];
  inviteId: string;
  email: string;
  country: Country;
  category: string;
  status: VendorStatus;
  name: string; // display name (legal name once known)
  invitedBy: string;
  invitedAt: string;
  submittedAt?: string;
  reviewStartedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  codeIssuedAt?: string;
  vendorCode?: string;
  firstTimeRight?: boolean;
  returnCount: number;
  lang: Lang;
  stage: 'welcome' | 'form' | 'documents' | 'review' | 'status';
  formStep: number; // 0..3
  company: CompanyInfo;
  tax: TaxInfo;
  bank: BankInfo;
  contacts: { sales: Contact; ar: Contact };
  documents: Record<string, UploadedDoc>;
  returnNote?: ReturnNote;
  audit: AuditEntry[];
  bankIsNew: boolean;
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
}

export type DemoUser = 'Deena (Approver)' | 'Hana (Requester)';

export interface AppState {
  vendors: Vendor[];
  sapVendors: SapVendor[];
  emails: Email[];
  settings: Settings;
  currentUser: DemoUser;
  seededAt: string;
  lastSeenAt: string; // notifications read marker
  tourDone: boolean;
  welcomeDismissed: boolean;
}

export const DEFAULT_SETTINGS: Settings = { requireCallback: true, segregationOfDuties: true, bankLetterMaxMonths: 6, autoAssign: true };
