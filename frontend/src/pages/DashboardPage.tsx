import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Inbox, CheckSquare, Plus, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.welcome')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 mb-10">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>{t('dashboard.totalForms')}</CardDescription>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-900" />
              </div>
            </div>
            <CardTitle className="text-3xl font-semibold">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.totalFormsDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>{t('dashboard.submissions')}</CardDescription>
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Inbox className="w-4 h-4 text-purple-900" />
              </div>
            </div>
            <CardTitle className="text-3xl font-semibold">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.submissionsDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>{t('dashboard.tasksCreated')}</CardDescription>
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckSquare className="w-4 h-4 text-green-900" />
              </div>
            </div>
            <CardTitle className="text-3xl font-semibold">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.tasksCreatedDesc')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/forms">
            <Card className="group cursor-pointer hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base group-hover:text-primary transition-colors">{t('dashboard.createForm')}</CardTitle>
                    <CardDescription>{t('dashboard.createFormDesc')}</CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/forms">
            <Card className="group cursor-pointer hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6 text-purple-900" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base group-hover:text-primary transition-colors">{t('dashboard.viewForms')}</CardTitle>
                    <CardDescription>{t('dashboard.viewFormsDesc')}</CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
