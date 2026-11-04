// End-to-end API flow in demo mode on a temporary database.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vendorhub-'));
process.env.APP_MODE = 'demo';
process.env.DATA_DIR = tmp;
process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL = 'http://localhost:5173';
fs.mkdirSync(path.join(tmp, 'samples'), { recursive: true });
const repoSamples = path.resolve(__dirname, '../../../../data/samples');
for (const f of fs.readdirSync(repoSamples)) fs.copyFileSync(path.join(repoSamples, f), path.join(tmp, 'samples', f));

const { createApp } = await import('../server.js');
const { openDatabase } = await import('../db/index.js');
const { DEMO_TOKENS } = await import('../db/seed.js');
const request = (await import('supertest')).default;

const db = openDatabase(path.join(tmp, 'test.db'));
const app = createApp(db);
const png = fs.readFileSync(path.join(repoSamples, 'alnoor-cr.png'));

async function login(email: string): Promise<string> {
  const r = await request(app).post('/api/auth/demo-login').send({ email });
  expect(r.status).toBe(200);
  return r.headers['set-cookie'][0].split(';')[0];
}

describe('Vendor Hub API', () => {
  let hana = '', deena = '', token = '', vendorId = '';
  beforeAll(async () => { hana = await login('hana@magrabi.example'); deena = await login('deena@magrabi.example'); });
  afterAll(() => { db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

  it('reports the signed-in user and demo mode', async () => {
    const r = await request(app).get('/api/auth/me').set('Cookie', hana);
    expect(r.body.user.email).toBe('hana@magrabi.example');
    expect(r.body.mode).toBe('demo');
    const out = await request(app).get('/api/auth/me');
    expect(out.status).toBe(401);
    expect(out.body.error.code).toBe('unauthenticated');
    expect(out.body.mode).toBe('demo');
    expect((await request(app).get('/api/health')).body.version).toBeDefined();
  });

  it('shows the seeded dashboard and flags the Nile duplicate', async () => {
    const d = await request(app).get('/api/staff/dashboard').set('Cookie', deena);
    expect(d.body.kpis.inQueue).toBe(3);
    const nile = await request(app).get('/api/staff/vendors/v-nile').set('Cookie', deena);
    expect(nile.body.summary.checks.find((c: { id: string }) => c.id === 'duplicate').level).toBe('flag');
    expect(nile.body.sapMatch.sap.code).toBe('400112');
    expect(nile.body.vendor.notes.length).toBe(1);
  });

  it('rejects unknown and expired vendor tokens', async () => {
    expect((await request(app).get('/api/v/nope')).status).toBe(404);
    db.prepare("UPDATE vendors SET invite_expires_at = '2000-01-01T00:00:00.000Z' WHERE id = 'v-jeddah'").run();
    expect((await request(app).get(`/api/v/${DEMO_TOKENS.jeddah}`)).status).toBe(410);
  });

  it('invites a vendor (requester) and the vendor can open the link', async () => {
    const r = await request(app).post('/api/staff/vendors/invite').set('Cookie', hana).send({ email: 'new@vendor.example', country: 'KSA', category: 'Printing & signage' });
    expect(r.status).toBe(200);
    token = r.body.link.split('/v/')[1];
    vendorId = r.body.vendor.id;
    const v = await request(app).get(`/api/v/${token}`);
    expect(v.status).toBe(200);
    expect(v.body.profile.checklist.length).toBe(5);
    const emails = await request(app).get('/api/staff/emails').set('Cookie', hana);
    expect(emails.body.rows.some((e: { kind: string; to: string }) => e.kind === 'invite' && e.to === 'new@vendor.example')).toBe(true);
  });

  it('fills the form with a Wathq lookup and validates the IBAN checksum', async () => {
    const look = await request(app).post(`/api/v/${token}/lookup`).send({ regNumber: '1010567890' });
    expect(look.body.found).toBe(true);
    expect(look.body.company.legalName).toBe('Al Noor Print House Co.');
    const bad = await request(app).post(`/api/v/${token}/validate`).send({ iban: 'SA80 8000 0000 1234 5678 9998' });
    expect(bad.body.iban.ok).toBe(false);
    expect(bad.body.iban.reason).toBe('checksum');
    const good = await request(app).post(`/api/v/${token}/validate`).send({ iban: 'SA4980000000123456789999', vatNumber: '300567890123453' });
    expect(good.body.iban.ok).toBe(true);
    expect(good.body.vat.ok).toBe(true);
    const p = await request(app).patch(`/api/v/${token}`).send({ stage: 'documents', formStep: 3, tax: { vatNumber: '300567890123453' }, bank: { iban: 'SA49 8000 0000 1234 5678 9999', bankName: 'Riyadh National Bank (sample)', accountHolder: 'Al Noor Print House Co.' }, contacts: { sales: { name: 'Faisal', email: 'f@x.example', phone: '1' }, ar: { name: 'Maha', email: 'm@x.example', phone: '2' } } });
    expect(p.status).toBe(200);
    expect(p.body.vendor.status).toBe('draft');
  });

  it('catches an old bank letter at upload, then accepts a fresh one', async () => {
    const old = await request(app).post(`/api/v/${token}/documents/bank-letter`).attach('file', png, '3a Bank letter - 8 months old (fails).png');
    expect(old.status).toBe(200);
    expect(old.body.document.level).toBe('fail');
    expect(old.body.document.checks.find((c: { id: string }) => c.id === 'date').reason).toMatch(/8 months ago/);
    const fresh = await request(app).post(`/api/v/${token}/documents/bank-letter`).attach('file', png, '4 Bank letter.png');
    expect(fresh.body.document.level).toBe('pass');
    expect(fresh.body.document.version).toBe(2);
    for (const slot of ['registration-form', 'cr', 'vat', 'quotation']) {
      const r = await request(app).post(`/api/v/${token}/documents/${slot}`).attach('file', png, `${slot}.png`);
      expect(r.body.document.level).toBe('pass');
    }
    const bad = await request(app).post(`/api/v/${token}/documents/cr`).attach('file', Buffer.from('hello'), 'x.txt');
    expect(bad.status).toBe(415);
  });

  it('submits, is opened for review (auto-assigned) and blocks approval by policy', async () => {
    const s = await request(app).post(`/api/v/${token}/submit`).send({ confirm: true });
    expect(s.status).toBe(200);
    expect(s.body.vendor.status).toBe('submitted');
    expect((await request(app).patch(`/api/v/${token}`).send({ company: { city: 'x' } })).status).toBe(422);
    await new Promise((r) => setTimeout(r, 3500)); // post-submit checks run in the background
    const d = await request(app).get(`/api/staff/vendors/${vendorId}`).set('Cookie', hana);
    expect(d.body.vendor.status).toBe('in_review');
    expect(d.body.vendor.assignee).toBe('Hana');
    expect(d.body.inviteLink).toBe(`http://localhost:5173/v/${token}`);
    expect(d.body.blockers.sod).toBeDefined();
    expect((await request(app).post(`/api/staff/vendors/${vendorId}/approve`).set('Cookie', hana)).status).toBe(403);
    const blocked = await request(app).post(`/api/staff/vendors/${vendorId}/approve`).set('Cookie', deena);
    expect(blocked.status).toBe(422);
    expect(blocked.body.error.fields.callback).toBeDefined();
  });

  it('approves after the call-back, produces the SAP sheet and issues the code', async () => {
    const cb = await request(app).post(`/api/staff/vendors/${vendorId}/callback`).set('Cookie', deena).send({ confirmed: true, phone: '+966 11 234 5678' });
    expect(cb.body.vendor.callbackConfirmedBy).toBe('Deena');
    const ok = await request(app).post(`/api/staff/vendors/${vendorId}/approve`).set('Cookie', deena);
    expect(ok.status).toBe(200);
    expect(ok.body.vendor.status).toBe('approved');
    const csv = await request(app).get(`/api/staff/vendors/${vendorId}/sap-sheet?format=csv`).set('Cookie', deena);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toMatch(/ZVND/);
    const code = await request(app).post(`/api/staff/vendors/${vendorId}/issue-code`).set('Cookie', deena).send({ code: '400116' });
    expect(code.body.vendor.status).toBe('code_issued');
    const sap = await request(app).get('/api/staff/sap-vendors?q=400116').set('Cookie', deena);
    expect(sap.body.rows[0].name).toBe('Al Noor Print House Co.');
    expect((await request(app).post(`/api/staff/vendors/${vendorId}/issue-code`).set('Cookie', deena).send({ code: '400116' })).status).toBe(422);
  });

  it('drafts a bilingual return note and returns Nile to the vendor', async () => {
    const draft = await request(app).get('/api/staff/vendors/v-nile/return-draft').set('Cookie', deena);
    expect(draft.body.en).toMatch(/400112/);
    expect(draft.body.ar).toMatch(/400112/);
    const ret = await request(app).post('/api/staff/vendors/v-nile/return').set('Cookie', deena).send({ en: draft.body.en, ar: draft.body.ar, items: draft.body.items });
    expect(ret.body.vendor.status).toBe('returned');
    const status = await request(app).get(`/api/v/${DEMO_TOKENS.nile}/status`);
    expect(status.body.vendor.returnNote.by).toBe('Deena');
  });

  it('serves files only to staff or the owning vendor', async () => {
    const d = await request(app).get(`/api/staff/vendors/${vendorId}`).set('Cookie', deena);
    const doc = d.body.vendor.documents[0];
    expect((await request(app).get(`/files/${doc.id}`)).status).toBe(403);
    expect((await request(app).get(`/files/${doc.id}?t=${token}`)).status).toBe(200);
    expect((await request(app).get(`/files/${doc.id}`).set('Cookie', deena)).status).toBe(200);
    expect((await request(app).get(`/files/${doc.id}?t=${DEMO_TOKENS.bright}`)).status).toBe(403);
  });

  it('scopes markets, manages users and settings, exports CSV', async () => {
    const sara = await login('sara@magrabi.example');
    const list = await request(app).get('/api/staff/vendors?status=all').set('Cookie', sara);
    expect(list.body.rows.every((v: { country: string }) => ['KW', 'QA', 'BH', 'OM'].includes(v.country))).toBe(true);
    expect((await request(app).get('/api/staff/vendors/v-nile').set('Cookie', sara)).status).toBe(403);
    const admin = await login('admin@magrabi.example');
    expect((await request(app).post('/api/staff/vendors/invite').set('Cookie', deena).send({ email: 'x@y.example', country: 'KSA', category: 'Logistics' })).status).toBe(403);
    const u = await request(app).post('/api/staff/users').set('Cookie', admin).send({ email: 'new.user@magrabi.example', name: 'New', role: 'requester', markets: ['EG'] });
    expect(u.status).toBe(200);
    expect((await request(app).get('/api/staff/users').set('Cookie', deena)).status).toBe(403);
    const s = await request(app).patch('/api/staff/settings').set('Cookie', admin).send({ requireCallback: false });
    expect(s.body.settings.requireCallback).toBe(false);
    const c = await request(app).get('/api/staff/countries').set('Cookie', deena);
    expect(c.body.rows.length).toBe(7);
    const csv = await request(app).get('/api/staff/reports/export?status=queue').set('Cookie', deena);
    expect(csv.text).toMatch(/Bright Display/);
    const imp = await request(app).post('/api/staff/sap-vendors/import').set('Cookie', admin).attach('file', Buffer.from('code,name,country,vat_number\n400999,Test Import Co,KSA,300000000000003\n'), 'sap.csv');
    expect(imp.body.imported).toBe(1);
  });
});
