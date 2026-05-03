import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher = ({ className }: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const next = current === 'ar' ? 'en' : 'ar';

  const handleToggle = () => {
    void i18n.changeLanguage(next);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={t('common.language')}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all text-xs font-bold uppercase tracking-wider',
        className
      )}
    >
      <Languages className="w-4 h-4" />
      <span>{next.toUpperCase()}</span>
    </button>
  );
};
