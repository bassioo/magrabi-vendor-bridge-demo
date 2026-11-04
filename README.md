# MAGRABi Vendor Hub

Vendor onboarding for MAGRABi across seven markets (KSA, UAE, Egypt, Kuwait, Qatar, Bahrain, Oman). Vendors register through one bilingual link; procurement reviews in one queue with AI-extracted fields beside the documents, rule checks, registry confirmations and a ready-to-key SAP sheet.

**AI reads. Rules check. Registries confirm. A person decides.**

This is the production codebase. The earlier clickable demo lives in `magrabi-vendor-bridge-demo` and stays as the team's review version.

## Run locally (demo mode, 2 minutes)

```bash
cp .env.example .env          # APP_MODE=demo is the default
npm install
npm run dev                   # API on :8787, web on :5173
```

Open http://localhost:5173, choose **Staff sign in**, and use a one-click demo user. Sample vendors, documents and emails are seeded. `Settings → About → Reset demo data` reseeds.

## Run it for real

```bash
cp .env.example .env          # set APP_MODE=live, PUBLIC_URL, SESSION_SECRET, ADMIN_EMAIL, SMTP_*, and keys you have
docker compose up -d --build  # http://localhost:8787
```

Or deploy with the included `render.yaml` (Render), or any Docker host with a persistent disk mounted at `/data`. See `docs/GO-LIVE-CHECKLIST.md` for what to prepare, and `docs/ARCHITECTURE.md` for how it fits together.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | API + web with hot reload |
| `npm run build` | shared → web → api |
| `npm start` | serve the built app (API + static web) |
| `npm run seed` | reseed demo data |
| `npm test` | unit tests (shared rules) + API tests |
| `npm run e2e` | end-to-end flow in a headless browser |
| `npm run typecheck` | all workspaces |

## Configuration

Everything is an environment variable; see `.env.example`. The only required values for live are `APP_MODE=live`, `PUBLIC_URL`, `SESSION_SECRET` and `ADMIN_EMAIL`. Without SMTP, emails stay in the Outbox. Without an Anthropic key, documents are not read automatically. Without a Wathq key, KSA lookups are manual.

## Repository layout

```
apps/api         Express API, SQLite, jobs, adapters
apps/web         React app (staff console + vendor side)
packages/shared  Types and rules used by both
docs/            API contract, architecture, go-live checklist
data/samples     Fictional sample documents for demo mode
```
