import { useLang } from '@/lib/i18n';

export function DemoBanner({ inline = false }: { inline?: boolean }) {
  const { t } = useLang();
  const cls = inline
    ? 'shrink-0 rounded-full border border-champagne bg-cream px-3 py-1 text-[11px] font-medium text-gold-deep'
    : 'fixed bottom-3 start-3 z-50 rounded-full border border-champagne bg-cream/95 px-3 py-1 text-[11px] font-medium text-gold-deep shadow-soft';
  return (
    <div className={cls} role="status">
      {t('brand.banner')}
    </div>
  );
}
