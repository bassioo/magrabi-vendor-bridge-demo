# MAGRABi Vendor Management · Onboarding bridge (demo)

A clickable demo of the **AI bridge** for vendor onboarding at MAGRABi, across seven markets (KSA, UAE, Egypt, Kuwait, Qatar, Bahrain, Oman): vendors self-register through one bilingual link, upload documents and get instant feedback; procurement reviews each vendor in a queue with AI-extracted fields beside the documents, approves or returns it, and gets a ready-to-key SAP sheet.

**AI reads. Rules check. Registries confirm. A person decides.**

> Demo only. Sample data only. SAP, Wathq, Sijilat, DED, GAFI, MOCI, MOCIIP, ZATCA, FTA, NBR, OTA, ETA and sanctions checks are all **simulated**. No real vendor data, no API keys.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Static build (drop `dist/` onto Netlify; a `_redirects` file is included for the SPA routes):

```bash
npm run build
npm run preview      # serves dist/ locally
```

Regenerate the sample documents or the screenshots (needs the dev server running for screenshots):

```bash
npm run samples      # public/samples/*.png
npm run screenshots  # docs/screenshots/*.png, also runs the whole demo flow as a test
RUNS=3 npm run screenshots   # the flow three times in a row
```

Everything lives in the browser's `localStorage`. **Reset demo** (top right of the procurement console) restores the sample data.

## Start here: the guided tour

Open the console and click **Take the tour** on the welcome card (or **Guided tour** in the sidebar, or the button on the landing page). Thirteen steps walk through the dashboard, queue, country rules, a review with a duplicate flag, the audit trail, the policy settings and the vendor side. Arrow keys move, Esc closes. The welcome card then tracks four things to try and ticks them off as you do them.

## What makes it usable as an MVP

- **Policies, not code** (Settings): call-back requirement, segregation of duties, assign-on-open and the bank-letter age limit are switches that change the review screen immediately.
- **Assignment**: opening a submitted vendor assigns it to you (switchable); "Assign to me" on any review; assignee column in the queue.
- **Internal notes** on every vendor, never shown to the vendor.
- **Notifications** bell with unread count across all vendors.
- **Outbox**: every bilingual email the system would have sent (invite, received, returned, approved, vendor code), readable in English and Arabic.
- **Queue**: sort by column, filter by status and market, export CSV. Global search with the `/` shortcut.
- **Document preview** full-size on both sides; zoom in the review viewer.
- **Mobile**: sidebar becomes a drawer; the vendor side is phone-first.

## Routes

| Route | What it is |
|---|---|
| `/` | Landing page: "Open as vendor" and "Open as procurement" |
| `/vendor/:inviteId` | Vendor side (EN / ع toggle). Seeded invites: `inv-alnoor-7f3k`, `inv-bright-q9d2`, `inv-nile-m4x8` |
| `/procurement` | Dashboard |
| `/procurement/queue` | Queue with filters and "Invite vendor" |
| `/procurement/vendors` | SAP vendor list (what the duplicate check matches against) |
| `/procurement/countries` | Country rules: registry, tax regime, IBAN format, document checklist per market |
| `/procurement/settings` | Approval policies, team, notification preferences, tour |
| `/procurement/outbox` | Simulated emails sent to vendors |
| `/procurement/vendors/:id` | Review screen; tabs for SAP keying sheet and audit trail |

Demo users (header switcher): **Hana (Requester)** invites, **Deena (Approver)** approves. The person who invited a vendor cannot approve them.

## 5-line demo script

1. **Procurement → Queue → Invite vendor** (email prefilled, KSA) → Generate link → Open link.
2. **Vendor:** toggle ع and back. Start → "Fill with sample data" on each step (the CR pulls Al Noor from Wathq, simulated). Documents: use the demo picker under *Bank letter* to show the 8-month-old letter caught at upload, then upload the good one. Submit.
3. **Procurement → Queue → Al Noor → Review.** Hana can't approve (she invited). Switch to Deena. All 7 checks green → Approve → tick the bank call-back box → SAP keying sheet → Copy all / Download CSV → enter vendor code (e.g. 400116) → Issue.
4. **Bright Display → Audit trail:** the old bank letter was caught at upload, before procurement ever saw it.
5. **Nile Gifts → Review:** duplicate flagged against SAP vendor 400112 → Return to vendor → bilingual AI-drafted note → Send. Back on the **Dashboard**, the KPIs have moved. Close on "A person decides".

## Testing with real files

The folder `261022 - C - Vendor Bridge Demo - Sample Documents` has one sub-folder per vendor (seven countries) plus a folder of documents that should fail. Upload those files on the vendor side: the demo recognises each file **by its name** and shows the matching extracted fields and checks. Any other file falls back to the hidden demo picker under the slot. Regenerate the folder with:

```bash
SAMPLES_EXPORT_DIR="/path/to/folder" npm run samples
```

## Country rules

All per-country differences live in `src/data/countries.ts`: registry name, registration label, tax regime and format (Kuwait and Qatar have no VAT, so the tax number is optional and no VAT certificate is requested), IBAN format, document checklist, SAP company code, bank-letter age limit. The Country rules page in the console renders that file. These are starting points for procurement to confirm.

## What is real vs simulated

Real logic, runs in the browser:
- IBAN **mod-97 checksum** for SA, AE, EG, KW, QA, BH and OM formats (`src/lib/iban.ts`).
- Policy rules: bank letter ≤ 6 months, registration not expired, VAT/TRN format, Arabic/English name normalisation (`src/lib/rules.ts`).
- Duplicate check against 15 fictional SAP vendors on CR, VAT, IBAN and normalised name (`src/lib/duplicates.ts`).
- Segregation of duties, approval gated on the bank call-back box, full audit trail, SAP keying sheet, CSV export.

Simulated, labelled "simulated" in the UI:
- Document reading. Any uploaded file maps to a pre-canned result chosen by the hidden **Demo picker** under each slot (`src/lib/mockAi.ts`). Model shown as "Simulated extraction v0".
- Registry lookups (Wathq, DED, GAFI, MOCI, Sijilat, MOCIIP), tax checks (ZATCA, FTA, ETA, NBR, OTA), sanctions screen, SAP vendor list. Realistic 600–1500 ms delays.
- Emails to vendors.

Optional live extraction: set `VITE_USE_LIVE_AI=true` and `VITE_ANTHROPIC_API_KEY` in `.env` (see `.env.example`). It is off by default and no key is shipped.

## Project structure

```
src/
  vendor/       Welcome, Form (4 steps), Documents, ReviewSubmit, Status
  app/          routes, landing, store (localStorage), Tour (guided tour) + tourSteps, NotFound
  procurement/  ProcurementLayout (sidebar shell), Dashboard, Queue, InviteModal, Review, ApproveModal, ReturnModal, SapSheet, AuditTrail, Notes, Vendors, CountryRules, Settings, Outbox
  components/   LensMark, StatusChip, CheckRow, KpiTile, DocViewer, Stepper, Headline, DemoBanner
  lib/          iban, rules, mockAi, mockRegistries, duplicates, reviewChecks, postSubmit, i18n, format, types
  data/         countries (all per-market rules), seed, sapVendors, sampleFiles.json, en.json, ar.json
  styles/       tokens.css (house style), index.css
public/samples/ fictional sample documents with a SAMPLE watermark
docs/screenshots/ backup screenshots of every main screen
scripts/        make-samples.mjs, screenshots.mjs
```
