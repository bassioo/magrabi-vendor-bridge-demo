# Vendor Hub API contract (v1)

Base path `/api`. JSON in and out. Errors: `{ "error": { "code": string, "message": string, "fields"?: Record<string,string> } }` with 400/401/403/404/409/422/429.
Timestamps are ISO strings. Types come from `@vendorhub/shared`.

## Auth (staff)
| Method | Path | Body / query | Returns | Notes |
|---|---|---|---|---|
| POST | /auth/request-link | `{ email }` | `{ ok: true }` | Sends magic link email (Outbox in demo). Always 200 to avoid user enumeration. Rate-limited. |
| GET | /auth/callback | `?token=` | 302 → `PUBLIC_URL/app` | Sets `vh_session` cookie (httpOnly, sameSite=lax, 14 days). |
| POST | /auth/demo-login | `{ email }` | `{ user }` | **APP_MODE=demo only.** Signs in as a seeded user. |
| POST | /auth/logout | | `{ ok }` | |
| GET | /auth/me | | `{ user, mode, settings }` | 401 when signed out. |

All `/api/staff/**` routes require a session. Role rules: admin = everything; approver = review + approve + settings read; requester = invite + review read + notes.

## Staff
| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | /staff/dashboard | | `{ kpis: { inQueue, newCount, inReview, avgDaysToCode, firstTimeRightPct, returnedThisMonth, overdue }, stages: [{stage, days}], byCountry: [{country, n}], attention: VendorListRow[], activity: AuditEntry&{vendorName}[] }` |
| GET | /staff/vendors | `?status=queue|returned|approved|invited|all&country=&q=&sort=date|name|country|status` | `{ rows: VendorListRow[] }` where `VendorListRow = Vendor & { summary: {text, level}, overdueDays?: number }` |
| POST | /staff/vendors/invite | `{ email, country, category, lang? }` | `{ vendor, link }` · creates vendor + invite email. Reuses an open invite for the same email. |
| GET | /staff/vendors/:id | | `{ vendor (with documents, audit, notes, registryChecks), summary: ReviewSummary, sapMatch?: DuplicateMatch, inviteLink }` · first open by staff moves submitted→in_review (+ auto-assign per settings) |
| POST | /staff/vendors/:id/assign | `{ userId? }` (default me) | `{ vendor }` |
| POST | /staff/vendors/:id/notes | `{ text }` | `{ note }` |
| POST | /staff/vendors/:id/callback | `{ confirmed: true, phone }` | `{ vendor }` · records who confirmed bank details |
| POST | /staff/vendors/:id/approve | `{ }` | `{ vendor }` · 422 if policy blocks (SoD, callback, failed checks) with `fields` explaining |
| POST | /staff/vendors/:id/return | `{ en, ar, items }` | `{ vendor }` · sets returned, emails vendor |
| POST | /staff/vendors/:id/reject | `{ reason }` | `{ vendor }` |
| GET | /staff/vendors/:id/return-draft | | `{ en, ar, items }` · AI-drafted when key present, template otherwise |
| GET | /staff/vendors/:id/sap-sheet | `?format=json|csv` | rows `[field, value][]` or CSV download |
| POST | /staff/vendors/:id/issue-code | `{ code }` | `{ vendor }` · adds to sap_vendors, emails vendor |
| POST | /staff/vendors/:id/resend-invite | | `{ link }` · new token, old one invalid |
| POST | /staff/vendors/:id/recheck | | `{ registryChecks }` · re-runs registry + duplicate + sanctions |
| GET | /staff/sap-vendors | `?q=` | `{ rows: SapVendor[] }` |
| POST | /staff/sap-vendors/import | multipart `file` (CSV: code,name,name_ar,country,reg_number,vat_number,iban) | `{ imported, skipped }` admin |
| GET | /staff/emails | `?vendorId=` | `{ rows: Email[] }` |
| GET | /staff/users | | `{ rows: User[] }` admin |
| POST | /staff/users | `{ email, name, role, markets }` | `{ user }` admin |
| PATCH | /staff/users/:id | `{ name?, role?, markets?, active? }` | `{ user }` admin |
| GET | /staff/settings | | `{ settings }` |
| PATCH | /staff/settings | `Partial<Settings>` | `{ settings }` admin |
| GET | /staff/countries | | `{ rows: CountryProfile[] }` |
| PUT | /staff/countries/:code | `CountryProfile` | `{ profile }` admin (validated) |
| GET | /staff/reports/export | `?status=` | CSV of the queue |
| GET | /staff/notifications | | `{ rows: (AuditEntry & {vendorName})[], unread }` · events by others since `lastSeenAt` |
| POST | /staff/notifications/seen | | `{ ok }` |
| GET | /staff/demo/reset | | **demo only** reseeds the database |

## Vendor (token in path, no login)
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | /v/:token | | `{ vendor (with documents), profile: CountryProfile, settings: {bankLetterMaxMonths}, mode }` · 404 unknown, 410 expired |
| PATCH | /v/:token | `{ lang?, stage?, formStep?, company?, tax?, bank?, contacts? }` | `{ vendor }` · autosave; refused once submitted unless status=returned |
| POST | /v/:token/lookup | `{ regNumber }` | `{ found, registry, provider, company? }` · country registry adapter |
| POST | /v/:token/validate | `{ iban?, vatNumber? }` | `{ iban?: IbanResult, vat?: {ok, message, messageAr, optional} }` |
| POST | /v/:token/documents/:slotId | multipart `file` (pdf/png/jpg ≤ 10 MB) | `{ document }` · runs extraction + checks; replaces previous version |
| DELETE | /v/:token/documents/:slotId | | `{ ok }` |
| POST | /v/:token/submit | `{ confirm: true }` | `{ vendor }` · requires all slots pass; runs registry/duplicate/sanctions async; emails vendor |
| GET | /v/:token/status | | `{ vendor, timeline }` |

## Files
`GET /files/:documentId` streams the stored file. Allowed for a staff session, or for the vendor whose token is passed as `?t=` (vendor token).

## Modes
`APP_MODE=demo`: seed data, demo login, simulated registries/sanctions when no keys, document recognition by sample file name when no AI key, `/staff/demo/reset`.
`APP_MODE=live`: no demo login, no simulation. Missing key ⇒ registry/sanctions checks are `manual` (a person confirms), extraction ⇒ `none` (fields typed by vendor, marked needs review).
