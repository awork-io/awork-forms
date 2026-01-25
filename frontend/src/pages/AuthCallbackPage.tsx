import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AuthCallbackPage() {
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
        setError(`Authentication was denied: ${errorParam}`);
        setIsProcessing(false);
        return;
      }

      if (!code || !state) {
        setError('Invalid callback - missing code or state parameter');
        setIsProcessing(false);
        return;
      }

      try {
        const response = await api.handleCallback(code, state);
        api.setToken(response.token);
        setUser(response.user);
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Signing you in...</CardTitle>
            <CardDescription>
              Please wait while we complete the authentication process.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="animate-pulse text-muted-foreground">
              Processing...
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
          <CardTitle className="text-xl text-red-500">Authentication Failed</CardTitle>
          <CardDescription>
            {error || 'An unknown error occurred'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={() => navigate('/login')} className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
