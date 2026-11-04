// Outbound email. Every message is stored in the emails table (the Outbox); SMTP delivery is attempted when configured.
import nodemailer from 'nodemailer';
import type { Email, Vendor } from '@vendorhub/shared';
import { config } from '../config.js';
import { insertEmail, type DB } from '../db/index.js';
import { uuid } from '../lib/ids.js';
import { nowIso } from '../lib/time.js';
import { log } from '../lib/log.js';

const transport = config.smtp.host
  ? nodemailer.createTransport({ host: config.smtp.host, port: config.smtp.port, secure: config.smtp.port === 465, auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined })
  : null;

export interface Outgoing { to: string; vendorId?: string; kind: Email['kind']; subject: string; bodyEn: string; bodyAr: string }

/** Stores the email, then tries SMTP. Never throws: a delivery failure is recorded on the row. */
export async function sendEmail(db: DB, m: Outgoing): Promise<Email> {
  const e: Email = { id: uuid(), at: nowIso(), to: m.to.toLowerCase(), vendorId: m.vendorId, kind: m.kind, subject: m.subject, bodyEn: m.bodyEn, bodyAr: m.bodyAr, delivery: transport ? 'smtp' : 'outbox' };
  if (transport) {
    try {
      await transport.sendMail({ from: config.smtp.from, to: e.to, subject: e.subject, text: `${e.bodyEn}\n\n----\n\n${e.bodyAr}` });
      e.deliveredAt = nowIso();
    } catch (err) {
      e.error = (err as Error).message;
      log.warn({ err, to: e.to }, 'SMTP delivery failed; kept in outbox');
    }
  }
  insertEmail(db, e);
  return e;
}

const first = (s: string) => s.split(' ')[0];
export const vendorLink = (token: string) => `${config.publicUrl}/v/${token}`;

/* ---------- templates (EN + AR) ---------- */
export const templates = {
  invite: (v: Vendor, token: string, by: string): Outgoing => ({
    to: v.email, vendorId: v.id, kind: 'invite', subject: 'MAGRABi · Your vendor registration link',
    bodyEn: `Hello,\n\nMAGRABi has invited you to register as a supplier (${v.category}). Use the link below. It takes about 10 minutes and you can save and come back.\n\n${vendorLink(token)}\n\nThe link is valid until ${v.inviteExpiresAt.slice(0, 10)}.\n\nKind regards,\n${first(by)} · MAGRABi Procurement`,
    bodyAr: `مرحبًا،\n\nدعتكم مغربي للتسجيل كمورّد (${v.category}). استخدموا الرابط أدناه. يستغرق الأمر حوالي 10 دقائق ويمكنكم الحفظ والعودة لاحقًا.\n\n${vendorLink(token)}\n\nالرابط صالح حتى ${v.inviteExpiresAt.slice(0, 10)}.\n\nمع أطيب التحيات،\nالمشتريات، مغربي`,
  }),
  reminder: (v: Vendor, token: string): Outgoing => ({
    to: v.email, vendorId: v.id, kind: 'reminder', subject: 'MAGRABi · Reminder: your vendor registration is waiting',
    bodyEn: `Hello,\n\nA quick reminder that your MAGRABi supplier registration has not been submitted yet. Everything you entered so far is saved.\n\n${vendorLink(token)}\n\nKind regards,\nMAGRABi Procurement`,
    bodyAr: `مرحبًا،\n\nتذكير سريع بأن طلب تسجيلكم كمورّد لدى مغربي لم يُرسل بعد. كل ما أدخلتموه محفوظ.\n\n${vendorLink(token)}\n\nمع أطيب التحيات،\nالمشتريات، مغربي`,
  }),
  submitted: (v: Vendor): Outgoing => ({
    to: v.email, vendorId: v.id, kind: 'submitted', subject: 'MAGRABi · Registration received',
    bodyEn: `Thank you. We received the registration for ${v.company.legalName || v.name}. Procurement reviews most files within two working days. You can follow progress on the same link.`,
    bodyAr: `شكرًا لكم. استلمنا طلب تسجيل ${v.company.legalNameAr || v.company.legalName || v.name}. يراجع فريق المشتريات معظم الطلبات خلال يومي عمل. يمكنكم متابعة الحالة من الرابط نفسه.`,
  }),
  returned: (v: Vendor, en: string, ar: string): Outgoing => ({ to: v.email, vendorId: v.id, kind: 'returned', subject: 'MAGRABi · A few things to fix in your registration', bodyEn: en, bodyAr: ar }),
  approved: (v: Vendor): Outgoing => ({
    to: v.email, vendorId: v.id, kind: 'approved', subject: 'MAGRABi · Your registration is approved',
    bodyEn: `Good news. ${v.company.legalName} is approved as a MAGRABi supplier. Your vendor code will follow once the record is created in our system.`,
    bodyAr: `خبر سار. تمت الموافقة على ${v.company.legalNameAr || v.company.legalName} كمورّد لدى مغربي. سيصلكم رمز المورّد بعد إنشاء السجل في نظامنا.`,
  }),
  codeIssued: (v: Vendor, code: string): Outgoing => ({
    to: v.email, vendorId: v.id, kind: 'code_issued', subject: `MAGRABi · Your vendor code is ${code}`,
    bodyEn: `Welcome aboard. Your MAGRABi vendor code is ${code}. Please quote it on every quotation and invoice. Payment terms: 60 days net, by bank transfer to the account you registered.`,
    bodyAr: `أهلًا بكم معنا. رمز المورّد الخاص بكم في مغربي هو ${code}. يرجى ذكره في كل عرض سعر وفاتورة. شروط الدفع: 60 يومًا صافي، بالتحويل البنكي إلى الحساب المسجّل.`,
  }),
  rejected: (v: Vendor, reason: string): Outgoing => ({
    to: v.email, vendorId: v.id, kind: 'rejected', subject: 'MAGRABi · Your vendor registration',
    bodyEn: `Thank you for your interest in working with MAGRABi. We are not able to proceed with the registration of ${v.company.legalName || v.name} at this time.\n\nReason: ${reason}\n\nKind regards,\nMAGRABi Procurement`,
    bodyAr: `شكرًا لاهتمامكم بالعمل مع مغربي. لا يمكننا المتابعة في تسجيل ${v.company.legalNameAr || v.company.legalName || v.name} في الوقت الحالي.\n\nالسبب: ${reason}\n\nمع أطيب التحيات،\nالمشتريات، مغربي`,
  }),
  magicLink: (email: string, link: string): Outgoing => ({
    to: email, kind: 'magic_link', subject: 'MAGRABi Vendor Hub · Your sign-in link',
    bodyEn: `Click to sign in to MAGRABi Vendor Hub. The link works once and expires in 15 minutes.\n\n${link}\n\nIf you did not request this, ignore this email.`,
    bodyAr: `اضغط للدخول إلى منصة مورّدي مغربي. الرابط يعمل مرة واحدة وينتهي خلال 15 دقيقة.\n\n${link}\n\nإذا لم تطلب ذلك، تجاهل هذه الرسالة.`,
  }),
};
