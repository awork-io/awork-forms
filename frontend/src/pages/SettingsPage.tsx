import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AworkLogo } from '@/components/ui/awork-logo';
import { User, Building2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/PageHeader';
import * as Sentry from '@sentry/react';
import { api, type AworkUser, type WorkspaceAccessSettings } from '@/lib/api';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function SettingsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [workspaceAccessSettings, setWorkspaceAccessSettings] = useState<WorkspaceAccessSettings | null>(null);
  const [workspaceUsers, setWorkspaceUsers] = useState<AworkUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  const handleSentryTest = () => {
    // Trigger frontend exception
    Sentry.captureException(new Error('Sentry test exception from frontend'));
    // Trigger backend exception
    api.triggerSentryTest().catch(() => { /* expected to fail with 500 */ });
  };

  useEffect(() => {
    if (!user?.isAworkAdmin && !user?.canManageWorkspaceAccess) return;

    const loadWorkspaceAccessSettings = async () => {
      setIsAccessLoading(true);
      try {
        const [settings, aworkUsers] = await Promise.all([
          api.getWorkspaceAccessSettings(),
          api.getAworkUsers(),
        ]);
        setWorkspaceAccessSettings(settings);
        setWorkspaceUsers(aworkUsers);
      } catch (error) {
        console.error('Failed to load workspace access settings:', error);
        toast({
          title: t('settings.accessControl.loadErrorTitle'),
          description: t('settings.accessControl.loadErrorBody'),
          variant: 'destructive',
        });
      } finally {
        setIsAccessLoading(false);
      }
    };

    void loadWorkspaceAccessSettings();
  }, [toast, t, user?.canManageWorkspaceAccess, user?.isAworkAdmin]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = userSearch.trim().toLowerCase();
    return workspaceUsers
      .filter((workspaceUser) => !workspaceUser.isArchived && !workspaceUser.isDeactivated && !workspaceUser.isExternal)
      .filter((workspaceUser) => {
        if (!normalizedSearch) return true;
        const displayName = `${workspaceUser.firstName || ''} ${workspaceUser.lastName || ''}`.trim().toLowerCase();
        const email = (workspaceUser.email || '').toLowerCase();
        return displayName.includes(normalizedSearch) || email.includes(normalizedSearch);
      })
      .sort((left, right) => getAworkUserLabel(left).localeCompare(getAworkUserLabel(right)));
  }, [userSearch, workspaceUsers]);

  const toggleAllowedUser = (aworkUserId: string) => {
    setWorkspaceAccessSettings((current) => {
      if (!current) return current;
      const allowedUserIds = current.allowedUserIds.includes(aworkUserId)
        ? current.allowedUserIds.filter((id) => id !== aworkUserId)
        : [...current.allowedUserIds, aworkUserId];

      return {
        ...current,
        allowedUserIds,
      };
    });
  };

  const handleSaveWorkspaceAccess = async () => {
    if (!workspaceAccessSettings) return;

    setIsSavingAccess(true);
    try {
      const savedSettings = await api.updateWorkspaceAccessSettings(workspaceAccessSettings);
      setWorkspaceAccessSettings(savedSettings);
      toast({
        title: t('settings.accessControl.saveSuccessTitle'),
        description: t('settings.accessControl.saveSuccessBody'),
      });
    } catch (error) {
      console.error('Failed to save workspace access settings:', error);
      toast({
        title: t('settings.accessControl.saveErrorTitle'),
        description: t('settings.accessControl.saveErrorBody'),
        variant: 'destructive',
      });
    } finally {
      setIsSavingAccess(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 pb-12">
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
                {(user?.isAworkAdmin || user?.canManageWorkspaceAccess) && (
                  <p className="mt-1 text-xs font-medium text-[#006dfa]">
                    {user?.isAworkAdmin
                      ? t('settings.accessControl.adminOverrideBadge')
                      : t('settings.accessControl.managerOverrideBadge')}
                  </p>
                )}
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
              <AworkLogo className="h-6" />
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
              <button
                type="button"
                onClick={handleSentryTest}
                className="text-sm font-medium text-green-900 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-green-100 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('settings.connected')}
              </button>
            </div>
          </CardContent>
        </Card>

        {(user?.isAworkAdmin || user?.canManageWorkspaceAccess) && (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                <CardTitle>{t('settings.accessControl.title')}</CardTitle>
              </div>
              <CardDescription>{t('settings.accessControl.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {workspaceAccessSettings ? (
                <>
                  <div className="flex items-start justify-between gap-4 rounded-[18px] border border-border/70 bg-muted/20 px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-medium">{t('settings.accessControl.allowAllLabel')}</p>
                      <p className="text-sm text-muted-foreground">{t('settings.accessControl.allowAllHint')}</p>
                      <p className="text-sm text-muted-foreground">{t('settings.accessControl.overrideHint')}</p>
                    </div>
                    <Switch
                      checked={workspaceAccessSettings.allowAllUsers}
                      onCheckedChange={(checked) => {
                        setWorkspaceAccessSettings((current) => current ? {
                          ...current,
                          allowAllUsers: checked,
                        } : current);
                      }}
                    />
                  </div>

                  {!workspaceAccessSettings.allowAllUsers && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="font-medium">{t('settings.accessControl.allowedUsersTitle')}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('settings.accessControl.allowedUsersHint', {
                            count: workspaceAccessSettings.allowedUserIds.length,
                          })}
                        </p>
                      </div>

                      <Input
                        value={userSearch}
                        onChange={(event) => setUserSearch(event.target.value)}
                        placeholder={t('settings.accessControl.searchPlaceholder')}
                      />

                      <div className="max-h-72 overflow-y-auto rounded-[18px] border border-border/70">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((workspaceUser) => (
                            <label
                              key={workspaceUser.id}
                              className="flex cursor-pointer items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-b-0 hover:bg-muted/20"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium">{getAworkUserLabel(workspaceUser)}</p>
                                {workspaceUser.email && (
                                  <p className="truncate text-sm text-muted-foreground">{workspaceUser.email}</p>
                                )}
                              </div>
                              <Checkbox
                                checked={workspaceAccessSettings.allowedUserIds.includes(workspaceUser.id)}
                                onCheckedChange={() => toggleAllowedUser(workspaceUser.id)}
                              />
                            </label>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-sm text-muted-foreground">
                            {t('settings.accessControl.noUsers')}
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {t('settings.accessControl.restrictedHint')}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => void handleSaveWorkspaceAccess()}
                      disabled={isSavingAccess}
                    >
                      {isSavingAccess
                        ? t('settings.accessControl.saving')
                        : t('settings.accessControl.save')}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {isAccessLoading ? t('common.loading') : t('settings.accessControl.loadErrorBody')}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function getAworkUserLabel(user: AworkUser) {
  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return displayName || user.email || user.id;
}
