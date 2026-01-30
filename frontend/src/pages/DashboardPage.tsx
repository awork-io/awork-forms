import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Inbox, CheckSquare, Plus, ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';

export function DashboardPage() {
  const { t } = useTranslation();
  const [totalForms, setTotalForms] = useState<number>(0);
  const [totalSubmissions, setTotalSubmissions] = useState<number>(0);
  const [tasksCreated, setTasksCreated] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [forms, submissions] = await Promise.all([
          api.getForms(),
          api.getSubmissions(),
        ]);

        setTotalForms(forms.length);
        setTotalSubmissions(submissions.length);
        // Count submissions that resulted in an awork task
        setTasksCreated(submissions.filter(s => s.aworkTaskId).length);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);
  return (
    <div className="p-6 lg:p-8 pb-12">
      <PageHeader
        title={(
          <span className="flex items-center gap-3">
            {t('dashboard.title')}
            <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
          </span>
        )}
        subtitle={t('dashboard.welcome')}
        className="mb-8"
      />

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
            <CardTitle className="text-4xl font-bold mt-2">
              {isLoading ? '—' : totalForms}
            </CardTitle>
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
            <CardTitle className="text-4xl font-bold mt-2">
              {isLoading ? '—' : totalSubmissions}
            </CardTitle>
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
            <CardTitle className="text-4xl font-bold mt-2">
              {isLoading ? '—' : tasksCreated}
            </CardTitle>
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
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/forms?action=create" className="h-full">
            <Card className="group cursor-pointer hover:shadow-[0_20px_40px_-12px_rgba(0,109,250,0.15)] hover:-translate-y-1 overflow-hidden relative h-full">
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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

          <Link to="/forms" className="h-full">
            <Card className="group cursor-pointer hover:shadow-[0_20px_40px_-12px_rgba(125,29,237,0.15)] hover:-translate-y-1 overflow-hidden relative h-full">
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

          <Link to="/submissions" className="h-full">
            <Card className="group cursor-pointer hover:shadow-[0_20px_40px_-12px_rgba(22,217,130,0.15)] hover:-translate-y-1 overflow-hidden relative h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-105 group-hover:shadow-green-500/40 transition-all duration-300">
                    <Inbox className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{t('dashboard.viewSubmissions')}</CardTitle>
                    <CardDescription className="mt-1">{t('dashboard.viewSubmissionsDesc')}</CardDescription>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-green-500/10">
                    <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-0.5 transition-transform" />
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
