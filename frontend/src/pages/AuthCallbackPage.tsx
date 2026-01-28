import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/i18n-errors';
import { useTranslation } from 'react-i18next';

export function AuthCallbackPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double processing (React Strict Mode)
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        sessionStorage.removeItem('oauth_state');
        setError(t('authCallback.denied', { error: errorParam }));
        setIsProcessing(false);
        return;
      }

      if (!code || !state) {
        sessionStorage.removeItem('oauth_state');
        setError(t('authCallback.missingParams'));
        setIsProcessing(false);
        return;
      }

      const storedState = sessionStorage.getItem('oauth_state');
      if (!storedState || storedState !== state) {
        setError(t('authCallback.denied', { error: 'Invalid state' }));
        setIsProcessing(false);
        return;
      }

      sessionStorage.removeItem('oauth_state');

      try {
        const response = await api.handleCallback(code, state);
        if (response.token) {
          api.setToken(response.token);
        }
        setUser(response.user);
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Callback error:', err);
        setError(getErrorMessage(err, t, 'authCallback.unknownError'));
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser, t]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{t('authCallback.signingIn')}</CardTitle>
            <CardDescription>
              {t('authCallback.wait')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="animate-pulse text-muted-foreground">
              {t('authCallback.processing')}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-red-500">{t('authCallback.failedTitle')}</CardTitle>
          <CardDescription>
            {error || t('authCallback.unknownError')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={() => navigate('/login')} className="w-full">
            {t('authCallback.tryAgain')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
