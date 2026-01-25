import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

export function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await login();
    } catch {
      setError('Failed to initiate login. Please try again.');
      setIsLoggingIn(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">awork Forms</CardTitle>
          <CardDescription>
            Create forms that connect to awork projects and tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-center">
            Sign in with your awork account to get started.
          </p>
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Redirecting...' : 'Sign in with awork'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
