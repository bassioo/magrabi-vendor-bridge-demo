// Walks the full 5-minute demo flow end to end, asserts the acceptance checklist, and screenshots each screen.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });
let n = 0;
const shot = async (page, name, full = false) => { n += 1; await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}${String(n).padStart(2, '0')}-${name}.png`, fullPage: full }); console.log('shot', name); };
const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT: ' + msg); console.log('ok  ', msg); };

const launch = { headless: true };
if (existsSync('/opt/pw-browsers/chromium/chrome')) launch.executablePath = '/opt/pw-browsers/chromium/chrome';
const browser = await chromium.launch(launch);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('dialog', (d) => d.accept());
page.on('pageerror', (e) => { console.error('PAGE ERROR', e.message); process.exitCode = 1; });

const runs = Number(process.env.RUNS ?? 1);
for (let run = 1; run <= runs; run += 1) {
  console.log(`--- run ${run} ---`);
  n = 0;
  // 1. Landing + procurement dashboard
  await page.goto(BASE + '/');
  await page.waitForSelector('text=without the email chase.');
  assert(await page.locator('text=Demo · sample data').first().isVisible(), 'demo banner visible on landing');
  if (run === 1) await shot(page, 'landing');
  await page.click('text=Open as procurement');
  await page.waitForSelector('text=Vendors in queue');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Confirm reset' }).click();
  await page.waitForTimeout(400);
  assert((await page.content()).includes('MAGRABi'), 'MAGRABi spelled with lowercase i');
  assert(!(await page.content()).includes('MAGRABI'), 'no MAGRABI in caps');
  if (run === 1) await shot(page, 'procurement-dashboard');

  // 1b. Guided tour: walk all steps from the welcome card
  await page.click('button:has-text("Take the tour")');
  await page.waitForSelector('text=Guided tour · 1 of');
  if (run === 1) await shot(page, 'tour-step-1');
  let steps = 1;
  for (let i = 0; i < 20; i += 1) {
    const next = page.locator('button:has-text("Next")');
    if ((await next.count()) === 0) break;
    await next.click();
    steps += 1;
    await page.waitForTimeout(900);
    const title = await page.locator('[role=dialog][aria-label="Guided tour"] h3').innerText();
    assert((await page.locator('[data-tour-spotlight]').count()) === 1, `tour step ${steps} "${title}" found its target`);
    if (run === 1 && steps === 7) await shot(page, 'tour-step-checks');
    if (run === 1 && steps === 12) await shot(page, 'tour-step-vendor');
  }
  assert(await page.locator('text=Now try it yourself').isVisible(), `tour reaches the final step (${steps} steps)`);
  await page.click('button:has-text("Finish")');
  await page.waitForTimeout(300);
  assert((await page.locator('text=Guided tour ·').count()) === 0, 'tour closes on Finish');
  // 1c. Settings toggles persist; outbox lists the seeded emails
  await page.goto(BASE + '/procurement/settings');
  await page.waitForSelector('text=Approval policies');
  if (run === 1) await shot(page, 'procurement-settings');
  await page.goto(BASE + '/procurement/outbox');
  await page.waitForSelector('text=Registration received');
  await page.click('tr:has-text("Registration received")');
  await page.waitForSelector('text=simulated email');
  if (run === 1) await shot(page, 'procurement-outbox-email');
  await page.keyboard.press('Escape');
  await page.click('button[aria-label="Close"]');
  // 1d. Notes + notifications on Nile
  await page.goto(BASE + '/procurement/vendors/v-nile');
  await page.waitForSelector('text=Internal notes');
  await page.fill('input[aria-label="New note"]', 'Called the vendor, waiting for their existing code.');
  await page.keyboard.press('Enter');
  await page.waitForSelector('text=Called the vendor');
  assert(true, 'internal note added');
  await page.goto(BASE + '/procurement');
  await page.click('button[aria-label^="Notifications"]');
  await page.waitForSelector('text=Mark all read');
  if (run === 1) await shot(page, 'procurement-notifications');
  await page.click('text=Mark all read');
  await page.keyboard.press('Escape');

  // 2. Queue + invite
  await page.click('a:has-text("Queue")');
  await page.waitForSelector('text=Every vendor');
  if (run === 1) await shot(page, 'procurement-queue');
  await page.click('button:has-text("Invite vendor")');
  await page.locator('[role=dialog] select').nth(0).selectOption('KSA');
  await page.click('button:has-text("Generate link")');
  const link = await page.locator('.font-mono').first().innerText();
  assert(link.includes('/vendor/inv-'), 'invite link generated: ' + link);
  if (run === 1) await shot(page, 'invite-link');
  await page.click('button:has-text("Done")');

  // 3. Vendor side
  await page.goto(link);
  await page.waitForSelector('text=What you\'ll need');
  if (run === 1) await shot(page, 'vendor-welcome-en');
  await page.click('button:has-text("ع")');
  await page.waitForSelector('text=ما ستحتاج إليه');
  assert((await page.getAttribute('[dir]', 'dir')) === 'rtl', 'Arabic toggle flips to RTL');
  if (run === 1) await shot(page, 'vendor-welcome-ar');
  await page.click('button:has-text("EN")');
  await page.click('button:has-text("Start")');
  await page.waitForSelector('text=Step 1 of 4');
  await page.click('button:has-text("Fill with sample data")');
  await page.waitForSelector('text=Verified · Wathq', { timeout: 5000 });
  if (run === 1) await shot(page, 'vendor-form-company-wathq');
  await page.click('button:has-text("Next")');
  await page.waitForSelector('text=Step 2 of 4');
  await page.click('button:has-text("Fill with sample data")');
  await page.waitForSelector('text=Format valid');
  await page.click('button:has-text("Next")');
  await page.waitForSelector('text=Step 3 of 4');
  // mistyped IBAN
  await page.fill('input[placeholder^="SA"]', 'SA80 8000 0000 1234 5678 9998');
  await page.waitForSelector('text=checksum does not add up');
  assert(true, 'mistyped IBAN rejected with a clear message');
  if (run === 1) await shot(page, 'vendor-form-iban-error');
  await page.click('button:has-text("Fill with sample data")');
  await page.waitForSelector('text=IBAN checksum valid');
  await page.click('button:has-text("Next")');
  await page.waitForSelector('text=Step 4 of 4');
  await page.click('button:has-text("Fill with sample data")');
  await page.click('button:has-text("Continue to documents")');
  await page.waitForSelector('text=Upload your');
  const inputs = page.locator('input[type=file]');
  const count = await inputs.count();
  assert(count === 5, `KSA checklist has 5 slots (${count})`);
  // Demonstrate the old bank letter caught at upload on the bank-letter slot (slot index 3)
  const bankCard = page.locator('.card', { hasText: 'Bank letter' }).first();
  // Upload a file from the sample folder by its real name: the app must recognise it without touching the picker
  await inputs.nth(3).setInputFiles({ name: '3a Bank letter - 8 months old (fails).pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 sample') });
  await bankCard.locator('text=This bank letter is dated 8 months ago').waitFor({ timeout: 6000 });
  assert(true, '8-month-old bank letter caught at upload (file recognised by name from the sample folder)');
  if (run === 1) await shot(page, 'vendor-documents-old-bank-letter');
  await inputs.nth(3).setInputFiles({ name: '4 Bank letter.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 sample') });
  for (const i of [0, 1, 2, 4]) {
    await inputs.nth(i).setInputFiles({ name: `document-${i + 1}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 sample') });
    await page.waitForTimeout(200);
  }
  await page.waitForSelector('text=All documents passed', { timeout: 15000 });
  if (run === 1) await shot(page, 'vendor-documents-all-pass');
  await page.click('button:has-text("Continue to review")');
  await page.waitForSelector('text=One last');
  if (run === 1) await shot(page, 'vendor-review-submit', true);
  await page.check('input[type=checkbox]');
  await page.click('button:has-text("Submit registration")');
  await page.waitForSelector('text=Application status');
  if (run === 1) await shot(page, 'vendor-status-submitted');

  // 4. Procurement review of Al Noor
  await page.goto(BASE + '/procurement/queue');
  await page.click('tr:has-text("Al Noor Print House") >> a:has-text("Review")');
  await page.waitForSelector('text=Extracted fields');
  await page.waitForSelector('text=Segregation of duties');
  assert(await page.locator('button:has-text("Approve")').first().isDisabled(), 'Hana (requester) cannot approve the vendor she invited');
  if (run === 1) await shot(page, 'procurement-review-alnoor-sod');
  await page.locator('select[aria-label="Demo user"]').first().selectOption('Deena (Approver)');
  await page.waitForTimeout(300);
  await page.waitForSelector('text=7 of 7 passed');
  if (run === 1) await shot(page, 'procurement-review-alnoor', true);
  await page.locator('button:has-text("Approve")').first().click();
  await page.waitForSelector('text=Approve vendor');
  const approveBtn = page.locator('button:has-text("Approve and open SAP sheet")');
  await page.locator('label', { hasText: 'I have reviewed the documents' }).locator('input').check();
  assert(await approveBtn.isDisabled(), 'approve blocked until bank call-back box is ticked');
  await page.locator('label', { hasText: 'call-back' }).locator('input').check();
  assert(await approveBtn.isEnabled(), 'approve enabled after call-back tick');
  if (run === 1) await shot(page, 'procurement-approve-modal');
  await approveBtn.click();
  await page.waitForSelector('text=SAP keying sheet');
  await page.waitForSelector('text=ZVND');
  await page.click('button:has-text("Copy all")');
  await page.waitForSelector('text=Copied');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download CSV")')]);
  assert((download.suggestedFilename()).endsWith('.csv'), 'CSV download: ' + download.suggestedFilename());
  if (run === 1) await shot(page, 'procurement-sap-sheet');
  await page.fill('input[placeholder="e.g. 400116"]', '400116');
  await page.click('button:has-text("Issue")');
  await page.waitForSelector('text=Vendor code 400116 issued');
  if (run === 1) await shot(page, 'procurement-code-issued');

  // 5. Bright Display history
  await page.goto(BASE + '/procurement/queue');
  await page.click('tr:has-text("Bright Display") >> a:has-text("Review")');
  await page.waitForSelector('text=Extracted fields');
  await page.click('a:has-text("Audit trail")');
  await page.waitForSelector('text=FAILED the 6-month rule');
  if (run === 1) await shot(page, 'procurement-bright-audit-trail', true);

  // 6. Nile Gifts duplicate + return
  await page.goto(BASE + '/procurement/queue');
  await page.click('tr:has-text("Nile Gifts") >> a:has-text("Review")');
  await page.waitForSelector('text=Possible match: SAP vendor 400112');
  assert(true, 'duplicate caught in review');
  if (run === 1) await shot(page, 'procurement-review-nile-duplicate', true);
  await page.click('button:has-text("Return to vendor")');
  await page.waitForSelector('text=A clear note');
  if (run === 1) await shot(page, 'procurement-return-note-bilingual');
  await page.click('button:has-text("Send and return")');
  await page.waitForSelector('text=Returned to the vendor');

  // 7. Dashboard updated + vendor sees the return
  await page.goto(BASE + '/procurement');
  await page.waitForSelector('text=Vendors in queue');
  if (run === 1) await shot(page, 'procurement-dashboard-after');
  await page.goto(BASE + '/procurement/countries');
  await page.waitForSelector('text=Seven markets');
  await page.click('button:has-text("Kuwait")');
  await page.waitForSelector('text=No VAT');
  if (run === 1) await shot(page, 'procurement-country-rules');
  await page.goto(BASE + '/procurement/vendors');
  await page.waitForSelector('text=SAP vendor list');
  assert((await page.content()).includes('400116'), 'issued vendor appears in SAP vendor list');
  if (run === 1) await shot(page, 'procurement-vendors');
  // A GCC market without VAT: invite a Kuwaiti vendor and run the form to the documents step
  await page.goto(BASE + '/procurement/queue');
  await page.click('button:has-text("Invite vendor")');
  await page.fill('input[type=email]', 'accounts@gulfshopfit.example');
  await page.locator('[role=dialog] select').nth(0).selectOption('KW');
  await page.click('button:has-text("Generate link")');
  const kwLink = await page.locator('.font-mono').first().innerText();
  await page.click('button:has-text("Done")');
  await page.goto(kwLink);
  await page.click('button:has-text("Start")');
  for (let i = 0; i < 4; i += 1) { await page.click('button:has-text("Fill with sample data")'); await page.waitForTimeout(i === 0 ? 1800 : 300); await page.click(i === 3 ? 'button:has-text("Continue to documents")' : 'button:has-text("Next")'); }
  await page.waitForSelector('text=Upload your');
  const kwInputs = page.locator('input[type=file]');
  assert((await kwInputs.count()) === 4, 'Kuwait checklist has 4 slots, no VAT certificate');
  await kwInputs.nth(1).setInputFiles({ name: '2 Commercial licence.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 sample') });
  await page.waitForSelector('text=Recognised as commercial licence', { timeout: 6000 });
  assert(true, 'Kuwaiti commercial licence recognised from the sample folder by name');
  if (run === 1) await shot(page, 'vendor-documents-kuwait');
  await page.goto(BASE + '/vendor/inv-nile-m4x8');
  await page.waitForSelector('text=What to fix');
  if (run === 1) await shot(page, 'vendor-status-returned');
  await page.click('button:has-text("ع")');
  await page.waitForSelector('text=ما يحتاج تصحيحًا');
  if (run === 1) await shot(page, 'vendor-status-returned-ar');

  // 8. Tablet width
  if (run === 1) {
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.goto(BASE + '/procurement/vendors/v-bright');
    await page.waitForSelector('text=Extracted fields');
    await shot(page, 'tablet-review');
    await page.goto(BASE + '/vendor/inv-nile-m4x8');
    await page.waitForSelector('text=حالة الطلب');
    await shot(page, 'tablet-vendor-ar');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE + '/procurement');
    await page.waitForSelector('text=Vendors in queue');
    await page.click('button[aria-label="Open menu"]');
    await page.waitForTimeout(400);
    await shot(page, 'mobile-dashboard-menu');
    await page.goto(BASE + '/vendor/inv-nile-m4x8');
    await page.waitForSelector('text=حالة الطلب');
    await shot(page, 'mobile-vendor-ar');
    await page.setViewportSize({ width: 1440, height: 900 });
  }
}
await browser.close();
console.log('DONE');
