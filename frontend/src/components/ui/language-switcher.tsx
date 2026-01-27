import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
] as const;

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'default' | 'minimal' | 'pill';
}

export function LanguageSwitcher({
  className,
  variant = 'default',
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const detected = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const current = LANGUAGES.find((l) => l.code === detected) || LANGUAGES[0];

  const triggerContent = (
    <>
      <span className="text-base leading-none">{current.flag}</span>
      <span className="uppercase text-[11px] font-semibold tracking-wide">{current.code}</span>
    </>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1.5 outline-none transition-all duration-200',
          variant === 'default' && 'px-2.5 py-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground',
          variant === 'minimal' && 'p-1 rounded hover:bg-black/5 text-muted-foreground hover:text-foreground',
          variant === 'pill' && 'px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-gray-200/50 hover:shadow-md hover:bg-white text-gray-600 hover:text-gray-900',
          className
        )}
      >
        {variant === 'minimal' ? (
          <Globe className="w-4 h-4" />
        ) : (
          triggerContent
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={cn(
              'flex items-center gap-2.5 cursor-pointer',
              current.code === lang.code && 'bg-accent'
            )}
          >
            <span className="text-base leading-none">{lang.flag}</span>
            <span className="flex-1">{lang.label}</span>
            {current.code === lang.code && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
