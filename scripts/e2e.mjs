// End-to-end: builds nothing; expects `npm run build` done. Starts the compiled API in demo mode on a temp data dir
// (serving apps/web/dist), then drives the real UI through the full flow in headless Chromium.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8790 + Math.floor(Math.random() * 100);
const BASE = `http://localhost:${PORT}`;
const data = mkdtempSync(join(tmpdir(), 'vendorhub-e2e-'));
const shots = join(root, 'docs', 'screenshots');
mkdirSync(shots, { recursive: true });
const SAMPLES = '/home/user/deliverables/261023 - C - Vendor Bridge Demo - Sample Documents';
// Pass buffers, not paths: headless Chromium drops file paths that contain non-ASCII characters (the folders use a middle dot).
const sample = (folder, file) => ({ name: file, mimeType: file.endsWith('.pdf') ? 'application/pdf' : 'image/png', buffer: readFileSync(join(SAMPLES, folder, file)) });

const api = spawn('node', ['apps/api/dist/server.js'], { cwd: root, env: { ...process.env, APP_MODE: 'demo', PORT: String(PORT), PUBLIC_URL: BASE, DATA_DIR: data, SESSION_SECRET: 'e2e-secret', NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'] });
let apiLog = '';
api.stdout.on('data', (d) => { apiLog += d; });
api.stderr.on('data', (d) => { apiLog += d; });
const until = async (fn, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return; } catch {} await new Promise((r) => setTimeout(r, 300)); } throw new Error('timeout'); };
await until(async () => (await fetch(`${BASE}/api/health`)).ok);

let n = 0;
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('ok  ', m); };
const shot = async (page, name) => { n += 1; await page.waitForTimeout(200); await page.screenshot({ path: join(shots, `${String(n).padStart(2, '0')}-${name}.png`), fullPage: false }); };

const launch = { headless: true };
if (existsSync('/opt/pw-browsers/chromium/chrome')) launch.executablePath = '/opt/pw-browsers/chromium/chrome';
const browser = await chromium.launch(launch);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const failed = [];
const trace = [];
page.on('request', (r) => { if (r.url().includes('/api/') && r.method() !== 'GET') trace.push(`${r.method()} ${r.url().replace(BASE, '')}`); });
page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/')) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')}`); });

try {
  // Staff: login as Hana (requester), dashboard, invite Jeddah
  await page.goto(BASE + '/login');
  await page.click('button:has-text("Hana")');
  await page.waitForURL('**/app**');
  await page.waitForSelector('text=Needs your attention');
  await shot(page, 'dashboard');
  await page.goto(BASE + '/app/queue');
  await page.click('button:has-text("Invite vendor")');
  await page.fill('#inv-email', 'finance@jeddahfixtures.example');
  await page.selectOption('#inv-country', 'KSA');
  await page.click('button:has-text("Send invitation")');
  const link = await page.locator('a:has-text("Open link")').getAttribute('href');
  ok(link && link.includes('/v/'), 'invite link generated: ' + link);
  await shot(page, 'invite');

  // Vendor side
  await page.goto(link);
  await page.waitForSelector("text=What you'll need");
  await page.click('button:has-text("ع")');
  await page.waitForSelector('text=ما ستحتاج إليه');
  ok(true, 'Arabic toggle');
  await shot(page, 'vendor-welcome-ar');
  await page.click('button:has-text("EN")');
  await page.click('button:has-text("Start")');
  await page.fill('#reg', '4030998877');
  await page.locator('#reg').blur();
  await page.waitForSelector('text=Wathq', { timeout: 8000 });
  await until(async () => (await page.inputValue('#ln')).includes('Jeddah'), 8000);
  ok(true, 'registry lookup filled the company');
  await shot(page, 'vendor-company');
  await page.click('button:has-text("Next")');
  await page.fill('#vat', '300998877665543');
  await page.click('button:has-text("Next")');
  await page.fill('#iban', 'SA80 8000 0000 1234 5678 9998');
  await page.locator('#iban').blur();
  await page.waitForSelector('text=checksum', { timeout: 5000 });
  ok(true, 'bad IBAN rejected');
  const goodIban = await (await fetch(`${BASE}/api/health`)).ok && 'SA' + (() => { const bban = '10000000998877665544'; const s = bban + 'SA00'; let r = 0; for (const ch of s) { const c = ch.charCodeAt(0); const p = c >= 65 && c <= 90 ? String(c - 55) : ch; for (const d of p) r = (r * 10 + (d.charCodeAt(0) - 48)) % 97; } return String(98 - r).padStart(2, '0') + bban; })();
  await page.fill('#iban', goodIban);
  await page.locator('#iban').blur();
  await page.fill('#bn', 'Jeddah Commercial Bank (sample)');
  await page.fill('#ah', 'Jeddah Optical Fixtures Co.');
  await page.click('button:has-text("Next")');
  for (const [k, v] of [['sales-name', 'Rakan Al-Ghamdi'], ['sales-email', 'rakan@jeddahfixtures.example'], ['sales-phone', '+966 55 987 6543'], ['ar-name', 'Noura Al-Zahrani'], ['ar-email', 'finance@jeddahfixtures.example'], ['ar-phone', '+966 12 654 3210']]) await page.fill('#' + k, v);
  await page.click('button:has-text("Continue to documents")');
  await page.waitForSelector('input[type=file]', { state: 'attached' });
  const inputs = page.locator('input[type=file]');
  ok((await inputs.count()) === 5, 'KSA has 5 upload slots');
  const F = '09 KSA · Jeddah Optical Fixtures (second live run)';
  await inputs.nth(3).setInputFiles(sample('02 UAE · Bright Display Trading (old bank letter, then new)', '3a Bank letter - 8 months old (fails).pdf'));
  await page.waitForSelector('text=dated 8 months ago', { timeout: 30000 });
  ok(true, 'old bank letter caught at upload');
  await shot(page, 'vendor-doc-fail');
  await inputs.nth(3).setInputFiles(sample(F, '4 Bank letter.pdf'));
  await page.waitForSelector('text=within the 6-month rule', { timeout: 15000 });
  for (const [i, f] of [[0, '1 Vendor registration form.pdf'], [1, '2 Commercial registration (CR).pdf'], [2, '3 VAT certificate.pdf'], [4, '5 Signed quotation.pdf']]) await inputs.nth(i).setInputFiles(sample(F, f));
  await until(async () => !(await page.locator('button:has-text("Continue to review")').isDisabled()), 30000);
  ok(true, 'all documents passed');
  await shot(page, 'vendor-docs');
  await page.click('button:has-text("Continue to review")');
  await page.waitForSelector('text=Submit registration');
  await page.check('input[type=checkbox]');
  await page.click('button:has-text("Submit registration")');
  await page.waitForSelector('text=Application status', { timeout: 15000 });
  await shot(page, 'vendor-status');

  // Staff: Hana cannot approve; Deena approves with call-back; SAP sheet; issue code
  await page.goto(BASE + '/app/queue');
  await page.click('tr:has-text("Jeddah Optical Fixtures")');
  await page.waitForSelector('text=Extracted fields');
  await until(async () => (await page.locator('text=Sanctions screen').count()) > 0, 10000);
  ok((await page.locator('button:has-text("Approve")').count()) === 0 || (await page.locator('button:has-text("Approve")').first().isDisabled()), 'requester cannot approve');
  await shot(page, 'review-as-requester');
  await page.request.post(BASE + '/api/auth/logout');
  await page.goto(BASE + '/login');
  await page.click('button:has-text("Deena")');
  await page.waitForURL('**/app**');
  await page.goto(BASE + '/app/queue');
  await page.click('tr:has-text("Jeddah Optical Fixtures")');
  await page.waitForSelector('text=Extracted fields');
  await until(async () => (await page.locator('text=of 9').count()) + (await page.locator('text=checks passed').count()) > 0, 15000).catch(() => {});
  await shot(page, 'review-as-approver');
  await page.locator('button:has-text("Approve")').first().click();
  await page.waitForSelector('text=Approve vendor');
  const approveBtn = page.locator('button:has-text("Approve and open SAP sheet")');
  ok(await approveBtn.isDisabled(), 'approve blocked until call-back confirmed');
  for (const cb of await page.locator('[role=dialog] input[type=checkbox]').all()) await cb.check();
  await approveBtn.click();
  await page.waitForSelector('text=SAP', { timeout: 10000 });
  await page.waitForSelector('text=ZVND');
  await shot(page, 'sap-sheet');
  await page.fill('input[aria-label="Vendor code"]', '400117');
  await page.click('button:has-text("Issue")');
  await page.waitForSelector('text=400117', { timeout: 10000 });
  ok(true, 'vendor code issued');
  await page.goto(BASE + '/app/sap');
  await page.waitForSelector('text=400117');
  ok(true, 'issued vendor appears in the SAP list');

  // Nile: duplicate flagged, return with bilingual note
  await page.goto(BASE + '/app/queue');
  await page.click('tr:has-text("Nile Gifts")');
  await page.waitForSelector('text=400112', { timeout: 10000 });
  ok(true, 'duplicate flagged');
  await page.locator('button:has-text("Return")').first().click();
  await page.waitForSelector('textarea', { timeout: 10000 });
  const ar = await page.locator('textarea').nth(1).inputValue();
  ok(/[؀-ۿ]/.test(ar), 'return draft has Arabic');
  await shot(page, 'return-note');
  await page.click('button:has-text("Send and return")');
  await page.waitForSelector('text=Returned', { timeout: 10000 });

  // Outbox + settings + vendor returned view
  await page.goto(BASE + '/app/outbox');
  await page.waitForSelector('text=Nile');
  await shot(page, 'outbox');
  await page.goto(BASE + '/app/settings');
  await page.waitForSelector('text=Segregation');
  await shot(page, 'settings');
  await page.goto(BASE + '/v/demo-nile-m4x8');
  await page.waitForSelector('text=Update and resubmit', { timeout: 10000 });
  await shot(page, 'vendor-returned');

  // Mobile vendor
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/v/demo-alnoor-7f3k');
  await page.waitForSelector("text=What you'll need");
  await shot(page, 'mobile-vendor');
  ok(errors.length === 0, 'no page errors (' + errors.join(' | ') + ')');
  console.log('E2E DONE');
} catch (e) {
  console.error('E2E FAILED:', e.message);
  if (failed.length) console.error('API failures:', failed.slice(-10).join('\n'));
  console.error('Last API writes:', trace.slice(-8).join(' | '));
  await page.screenshot({ path: join(shots, 'failure.png') }).catch(() => {});
  console.error(apiLog.split('\n').filter((l) => !l.includes('"req":')).slice(-15).join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  api.kill();
}
