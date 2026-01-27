import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

export function LoginPage() {
  const { t } = useTranslation();
  const { login, isLoading: authLoading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await login();
    } catch {
      setError(t('login.error'));
      setIsLoggingIn(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed top-4 right-4">
        <LanguageSwitcher variant="pill" />
      </div>
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('brand.full')}</CardTitle>
            <CardDescription>
              {t('login.tagline')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-center">
              {t('login.intro')}
            </p>
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <Button
              className="w-full"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? t('login.redirecting') : t('login.signIn')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
