import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AworkLogo } from '@/components/ui/awork-logo';
import { User, Building2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/PageHeader';

export function SettingsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        className="mb-8"
      />

      <div className="grid gap-5 max-w-2xl">
        {/* Account section */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-muted-foreground" />
              <CardTitle>{t('settings.accountTitle')}</CardTitle>
            </div>
            <CardDescription>{t('settings.accountDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-16 h-16 rounded-full ring-2 ring-white shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-white shadow-md">
                  <span className="text-xl font-semibold text-primary">
                    {user?.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-lg">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    {t('settings.workspace')}
                  </div>
                  <span className="text-sm font-medium">{user?.workspaceName || user?.workspaceId}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About section */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AworkLogo className="h-4" />
              <CardTitle>{t('settings.formsTitle')}</CardTitle>
            </div>
            <CardDescription>{t('settings.formsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('settings.version')}</span>
              <span className="text-sm font-medium px-2 py-0.5 bg-muted rounded">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('settings.status')}</span>
              <span className="text-sm font-medium text-green-900 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('settings.connected')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
