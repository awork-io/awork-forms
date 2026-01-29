import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { AworkLogo } from '@/components/ui/awork-logo';
import { ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="fixed top-4 right-4 z-10">
        <LanguageSwitcher variant="pill" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <Card className="overflow-hidden">
          {/* Gradient top bar */}
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          
          <CardHeader className="text-center pt-8 pb-4">
            <div className="flex justify-center mb-4">
              <AworkLogo className="h-7" />
            </div>
            <CardTitle className="text-2xl font-bold">{t('brand.product')}</CardTitle>
            <CardDescription className="text-base mt-2">
              {t('login.tagline')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex flex-col gap-5 pb-8">
            <p className="text-muted-foreground text-center">
              {t('login.intro')}
            </p>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
                {error}
              </div>
            )}
            
            <Button
              size="lg"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('login.redirecting')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {t('login.signIn')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t('publicForm.poweredByPrefix')}{' '}
          <a 
            href="https://awork.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            awork
          </a>
        </p>
      </div>
    </div>
  );
}
