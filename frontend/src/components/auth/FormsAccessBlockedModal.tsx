import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';

export function FormsAccessBlockedModal() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('formsAccessBlocked.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('formsAccessBlocked.description', {
                workspaceName: user?.workspaceName || user?.workspaceId || 'awork',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => void logout()}>
              {t('formsAccessBlocked.signOut')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
