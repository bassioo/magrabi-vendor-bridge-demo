-- MAGRABi Vendor Hub · SQLite schema (v1). Applied idempotently on start. JSON columns hold structured sub-objects.
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','approver','requester')),
  markets TEXT NOT NULL DEFAULT 'all',          -- 'all' or JSON array of country codes
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                           -- random token (hashed)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  invite_token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL COLLATE NOCASE,
  country TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT 'en',
  stage TEXT NOT NULL DEFAULT 'welcome',
  form_step INTEGER NOT NULL DEFAULT 0,
  invited_by TEXT NOT NULL,
  invited_at TEXT NOT NULL,
  invite_expires_at TEXT NOT NULL,
  submitted_at TEXT,
  review_started_at TEXT,
  approved_at TEXT,
  approved_by TEXT,
  code_issued_at TEXT,
  vendor_code TEXT,
  assignee TEXT,
  return_count INTEGER NOT NULL DEFAULT 0,
  first_time_right INTEGER,
  bank_is_new INTEGER NOT NULL DEFAULT 1,
  callback_confirmed_by TEXT,
  callback_confirmed_at TEXT,
  company_json TEXT NOT NULL DEFAULT '{}',
  tax_json TEXT NOT NULL DEFAULT '{}',
  bank_json TEXT NOT NULL DEFAULT '{}',
  contacts_json TEXT NOT NULL DEFAULT '{}',
  return_note_json TEXT,
  last_reminder_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS vendors_email ON vendors(email);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  extracted_json TEXT NOT NULL DEFAULT '{}',
  extraction_source TEXT NOT NULL DEFAULT 'none',
  extraction_model TEXT,
  checks_json TEXT NOT NULL DEFAULT '[]',
  level TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  current INTEGER NOT NULL DEFAULT 1              -- 0 once replaced; old versions are kept for the audit trail
);
CREATE INDEX IF NOT EXISTS documents_vendor ON documents(vendor_id, slot_id, current);

CREATE TABLE IF NOT EXISTS registry_checks (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                             -- company | tax | sanctions | duplicate
  provider TEXT NOT NULL,
  status TEXT NOT NULL,                           -- pass | flag | fail | pending | manual
  summary TEXT NOT NULL,
  detail TEXT,
  checked_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS registry_vendor ON registry_checks(vendor_id, kind);

CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS audit_vendor ON audit(vendor_id, at);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  at TEXT NOT NULL,
  by TEXT NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sap_vendors (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  country TEXT NOT NULL,
  reg_number TEXT NOT NULL DEFAULT '',
  vat_number TEXT NOT NULL DEFAULT '',
  iban TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'import'
);

CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  to_email TEXT NOT NULL,
  vendor_id TEXT,
  kind TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_en TEXT NOT NULL,
  body_ar TEXT NOT NULL,
  delivery TEXT NOT NULL,                        -- smtp | outbox
  delivered_at TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS emails_at ON emails(at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS country_rules (
  country TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL,                    -- CountryProfile from the shared package, editable by admins
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
