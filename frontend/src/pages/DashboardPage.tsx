import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardPage() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Welcome, {user?.name}</CardTitle>
                <CardDescription>
                  {user?.email} • Workspace: {user?.workspaceId}
                </CardDescription>
              </div>
              {user?.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-12 h-12 rounded-full"
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              You are now signed in to awork Forms. This is where you will manage your forms.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={logout}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
