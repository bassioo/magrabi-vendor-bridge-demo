# Architecture · MAGRABi Vendor Hub

One deployable unit, three parts:

```
apps/web        React + Vite + Tailwind. Static files, served by the API in production.
apps/api        Node 22 + Express + SQLite (better-sqlite3). Auth, workflow, uploads, AI extraction, registries, email, jobs.
packages/shared Pure TypeScript shared by both: domain types, country profiles, IBAN mod-97, rules, document checks, review checks.
```

Principle on every screen and in the code: **AI reads. Rules check. Registries confirm. A person decides.**

## Request flow
- Staff sign in with a magic link (no passwords). Session cookie, 14 days, httpOnly.
- Vendors never sign in. The invitation link carries a random token; the API stores only its hash. Links expire (default 30 days) and can be re-sent.
- Every vendor change autosaves through `PATCH /api/v/:token`. Uploads go to `POST /api/v/:token/documents/:slot` and are stored on the data volume under `uploads/`, one versioned record per upload.
- On upload the API runs **extraction** then **rules**:
  - extraction = Claude vision (key present) → demo catalogue (demo mode) → none (vendor-typed data).
  - rules = `runDocChecks` from the shared package: type, legibility, stamp, dates within policy.
- On submit the API runs **registry checks** asynchronously: company registry (Wathq for KSA when a key is set), tax number, sanctions, duplicate against the SAP list. Without a connector a check is `manual`, shown as a flag that a person confirms. Nothing is ever faked in live mode.
- Review computes `reviewChecks` (shared) from the stored facts. Approve is refused server-side when policies say so (segregation of duties, bank call-back, failed checks).
- Every action appends to the `audit` table. Nothing is deleted; replaced documents keep their row with `current = 0`.

## Modes
`APP_MODE=demo` seeds sample data, allows one-click sign-in, simulates registries and recognises sample documents by file name. `APP_MODE=live` does none of that. Same code, one env var.

## Data
SQLite on a persistent volume is deliberate for a pilot: one file to back up, zero operations. The repository layer in `apps/api/src/db` is the only place that knows SQL; moving to Postgres later means replacing that layer, not the app. Uploaded files sit next to the database so one snapshot captures both.

## Integrations (adapters in `apps/api/src/services/registries.ts`)
| Check | Live connector | Without connector |
|---|---|---|
| KSA commercial registration | Wathq API (`WATHQ_API_KEY`) | manual |
| UAE, Egypt, Kuwait, Qatar, Bahrain, Oman registries | adapter stubs with the same interface | manual |
| Tax numbers | format rule always; authority lookup adapter stub | manual |
| Sanctions | adapter stub (plug a screening provider) | manual |
| Duplicate | SAP vendor list imported as CSV | works |
| Document reading | Anthropic API | vendor-typed, needs review |
| Email | SMTP | kept in the Outbox |

## Security
helmet headers, CORS pinned to `PUBLIC_URL`, rate limits on auth and vendor endpoints, zod validation on every body, file type and size limits (PDF/PNG/JPG, 10 MB), hashed tokens, role and market scoping on every staff route, no secrets in the repo.

## Operations
`docker compose up` or the Render blueprint. Health at `/api/health`. Logs are JSON (pino). Back up `/data`. Upgrade = deploy the new image; the schema applies itself.
