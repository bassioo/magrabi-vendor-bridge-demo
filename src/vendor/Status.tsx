import { Check, Mail, RotateCcw } from 'lucide-react';
import type { Vendor } from '@/lib/types';
import { useStore } from '@/app/store';
import { useLang, pick } from '@/lib/i18n';
import { Headline } from '@/components/Headline';
import { fmtDateTime } from '@/lib/format';

const STEPS = ['submitted', 'in_review', 'approved', 'code_issued'] as const;

export function StatusTracker({ vendor }: { vendor: Vendor }) {
  const { t, lang } = useLang();
  const store = useStore();
  const idx = vendor.status === 'submitted' ? 0 : vendor.status === 'in_review' || vendor.status === 'returned' ? 1 : vendor.status === 'approved' ? 2 : vendor.status === 'code_issued' ? 3 : 0;
  const returned = vendor.status === 'returned';
  const title = returned ? ['titleReturned', 'titleReturnedAccent'] : vendor.status === 'code_issued' ? ['titleCode', 'titleCodeAccent'] : vendor.status === 'approved' ? ['titleApproved', 'titleApprovedAccent'] : ['title', 'titleAccent'];
  const times = [vendor.submittedAt, vendor.reviewStartedAt, vendor.approvedAt, vendor.codeIssuedAt];

  const resubmit = () => {
    store.update(vendor.id, (v) => ({ ...v, stage: 'documents', status: 'draft' }));
    store.audit(vendor.id, 'Vendor', 'system', 'Started updating the registration after return');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Headline eyebrow={t('status.eyebrow')} text={t(`status.${title[0]}`)} accent={t(`status.${title[1]}`)} size="md" />
      <div className="mt-2 text-xs text-muted">{t('status.ref')}: {vendor.inviteId.toUpperCase()} · {vendor.company.legalName}</div>

      <div className="card mt-6 p-6">
        <ol className="grid gap-3 md:grid-cols-4">
          {STEPS.map((s, i) => {
            const done = i < idx || (i === idx && !returned && vendor.status !== 'submitted') || vendor.status === 'code_issued';
            const active = i === idx;
            const cls = returned && active ? 'border-flag bg-flag-bg text-flag' : done || (active && i === 0) ? 'border-pass bg-pass-bg text-pass' : active ? 'border-gold bg-cream text-gold-deep' : 'border-champagne/60 text-muted';
            return (
              <li key={s} className={`rounded-xl border p-4 ${cls}`}>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  {(done || i === 0) && !(returned && active) ? <Check size={14} /> : <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current" />}
                  {t(`status.steps.${s}`)}
                </div>
                <div className="mt-1 text-xs opacity-80">{times[i] ? fmtDateTime(times[i]) : active ? pick(lang, 'Now', 'الآن') : '—'}</div>
              </li>
            );
          })}
        </ol>
      </div>

      {returned && vendor.returnNote && (
        <div className="card mt-5 border border-flag/30 p-6">
          <h2 className="text-lg">{t('status.returnedTitle')}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-body">{lang === 'ar' ? vendor.returnNote.ar : vendor.returnNote.en}</p>
          <div className="mt-2 text-xs text-muted">{vendor.returnNote.by} · {fmtDateTime(vendor.returnNote.sentAt)}</div>
          <button className="btn-teal mt-5" onClick={resubmit}><RotateCcw size={14} /> {t('status.resubmit')}</button>
        </div>
      )}

      {vendor.status === 'code_issued' && <div className="card mt-5 bg-cream p-6 text-base text-ink">{t('status.codeText', { code: vendor.vendorCode ?? '' })}</div>}
      {vendor.status === 'approved' && <div className="card mt-5 bg-cream p-6 text-base text-ink">{t('status.approvedText')}</div>}

      {(vendor.status === 'submitted' || vendor.status === 'in_review') && (
        <div className="card mt-5 p-6">
          <h2 className="flex items-center gap-2 text-lg"><Mail size={16} className="text-gold-deep" /> {t('status.whatNext')}</h2>
          <p className="mt-2 text-sm text-body">{t('status.nextText', { email: vendor.email })}</p>
        </div>
      )}
    </div>
  );
}
