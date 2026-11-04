// Bilingual "return to vendor" note: built from the flagged checks, optionally polished by Claude.
import Anthropic from '@anthropic-ai/sdk';
import type { DocumentRecord, ReviewSummary, Vendor } from '@vendorhub/shared';
import { config } from '../config.js';
import { log } from '../lib/log.js';

export interface Draft { en: string; ar: string; items: string[] }

export function templateDraft(vendor: Vendor, summary: ReviewSummary, docs: DocumentRecord[], by: string): Draft {
  const issues = summary.checks.filter((c) => c.level !== 'pass' && c.fixEn);
  const failedDocs = docs.filter((d) => d.level === 'fail');
  const en = [
    `Dear ${vendor.contacts.ar.name || vendor.name},`, '',
    `Thank you for registering ${vendor.company.legalName || vendor.name} with MAGRABi. Our automated checks ran on your submission and a person on the procurement team has reviewed it. Before we can create your vendor account, we need your help with the following:`, '',
    ...issues.map((c, i) => `${i + 1}. ${c.fixEn}`),
    ...failedDocs.map((d, i) => `${issues.length + i + 1}. ${d.checks.filter((c) => c.level === 'fail').map((c) => c.reason).join(' ')}`),
    '', 'You can update and resubmit from the same link; everything else you entered is saved. If anything is unclear, reply to this email and we will help.', '', 'Kind regards,', `${by.split(' ')[0]} · MAGRABi Procurement`,
  ].join('\n');
  const ar = [
    `الأستاذ/ة ${vendor.contacts.ar.name || vendor.name} المحترم/ة،`, '',
    `شكرًا لتسجيل ${vendor.company.legalNameAr || vendor.company.legalName || vendor.name} لدى مغربي. تمت مراجعة طلبكم بواسطة فحوصاتنا الآلية ثم من قِبل أحد أعضاء فريق المشتريات. وقبل إنشاء حساب المورّد، نحتاج مساعدتكم في النقاط التالية:`, '',
    ...issues.map((c, i) => `${i + 1}. ${c.fixAr}`),
    ...failedDocs.map((d, i) => `${issues.length + i + 1}. ${d.checks.filter((c) => c.level === 'fail').map((c) => c.reasonAr).join(' ')}`),
    '', 'يمكنكم التحديث وإعادة الإرسال من الرابط نفسه، وكل ما أدخلتموه سابقًا محفوظ. وإذا كان هناك أي استفسار، يرجى الرد على هذا البريد وسنسعد بمساعدتكم.', '', 'مع أطيب التحيات،', `${by.split(' ')[0]} · المشتريات، مغربي`,
  ].join('\n');
  return { en, ar, items: [...issues.map((c) => c.label), ...failedDocs.map((d) => d.slotId)] };
}

export async function draftReturnNote(vendor: Vendor, summary: ReviewSummary, docs: DocumentRecord[], by: string): Promise<Draft & { source: 'template' | 'ai' }> {
  const t = templateDraft(vendor, summary, docs, by);
  if (!config.anthropicKey) return { ...t, source: 'template' };
  try {
    const client = new Anthropic({ apiKey: config.anthropicKey });
    const r = await client.messages.create({
      model: config.anthropicModel, max_tokens: 2048,
      system: 'You polish procurement emails to vendors. Keep every fact, number and item; keep the tone warm and clear; keep the same structure. Return strict JSON {"en": string, "ar": string} with the Arabic as natural Gulf/MSA business Arabic.',
      messages: [{ role: 'user', content: JSON.stringify({ en: t.en, ar: t.ar }) }],
    });
    const text = r.content.filter((b) => b.type === 'text').map((b) => (b.type === 'text' ? b.text : '')).join('');
    const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as { en?: string; ar?: string };
    if (j.en && j.ar) return { en: j.en, ar: j.ar, items: t.items, source: 'ai' };
  } catch (err) {
    log.warn({ err }, 'Return note polish failed; using template');
  }
  return { ...t, source: 'template' };
}
