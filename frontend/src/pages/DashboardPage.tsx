import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Inbox, CheckSquare, Plus, ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
        </div>
        <p className="text-muted-foreground text-lg">{t('dashboard.welcome')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 mb-12">
        <Card className="group hover:shadow-[0_20px_40px_-12px_rgba(0,109,250,0.12)] hover:-translate-y-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">{t('dashboard.totalForms')}</CardDescription>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.totalFormsDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-[0_20px_40px_-12px_rgba(125,29,237,0.12)] hover:-translate-y-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">{t('dashboard.submissions')}</CardDescription>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform duration-300">
                <Inbox className="w-5 h-5 text-white" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.submissionsDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-[0_20px_40px_-12px_rgba(22,217,130,0.12)] hover:-translate-y-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">{t('dashboard.tasksCreated')}</CardDescription>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25 group-hover:scale-110 transition-transform duration-300">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">0</CardTitle>
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
        <h2 className="text-xl font-bold mb-5">{t('dashboard.quickActions')}</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Link to="/forms">
            <Card className="group cursor-pointer hover:shadow-[0_20px_40px_-12px_rgba(0,109,250,0.15)] hover:-translate-y-1 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 group-hover:shadow-blue-500/40 transition-all duration-300">
                    <Plus className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{t('dashboard.createForm')}</CardTitle>
                    <CardDescription className="mt-1">{t('dashboard.createFormDesc')}</CardDescription>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-primary/10">
                    <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/forms">
            <Card className="group cursor-pointer hover:shadow-[0_20px_40px_-12px_rgba(125,29,237,0.15)] hover:-translate-y-1 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-105 group-hover:shadow-purple-500/40 transition-all duration-300">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{t('dashboard.viewForms')}</CardTitle>
                    <CardDescription className="mt-1">{t('dashboard.viewFormsDesc')}</CardDescription>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-purple-500/10">
                    <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
