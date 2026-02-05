import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export function ReauthBanner() {
  const { t } = useTranslation();
  const { login } = useAuth();

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="flex items-center justify-between gap-4 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">
              {t('auth.sessionLimited')}
            </p>
            <p className="text-sm text-amber-700">
              {t('auth.sessionLimitedDesc')}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="flex-shrink-0 border-amber-300 bg-white hover:bg-amber-100 text-amber-800"
          onClick={login}
        >
          {t('auth.reauthenticate')}
        </Button>
      </div>
    </div>
  );
}
