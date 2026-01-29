import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, type Form, type FormDetail, type Submission } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { getFieldLabels } from '@/lib/form-types';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ClipboardList, Copy, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyStateCard } from '@/components/common/EmptyStateCard';
import { SubmissionsTable } from '@/components/submissions/SubmissionsTable';
import { SubmissionDetailDialog } from '@/components/submissions/SubmissionDetailDialog';
import { formatDateForLocale } from '@/lib/date-format';

export function SubmissionsPage() {
  const { t, i18n } = useTranslation();
  const { formId } = useParams<{ formId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [form, setForm] = useState<FormDetail | null>(null);
  const [selectedForm, setSelectedForm] = useState<FormDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [filterFormId, setFilterFormId] = useState<string>('all');

  const handleSelectSubmission = async (submission: Submission | null) => {
    setSelectedSubmission(submission);
    if (submission && !formId) {
      try {
        const formData = await api.getForm(submission.formId);
        setSelectedForm(formData);
      } catch {
        setSelectedForm(null);
      }
    } else {
      setSelectedForm(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (formId) {
          const [formData, submissionsData] = await Promise.all([
            api.getForm(parseInt(formId)),
            api.getFormSubmissions(parseInt(formId)),
          ]);
          setForm(formData);
          setSubmissions(submissionsData);
        } else {
          const [submissionsData, formsData] = await Promise.all([
            api.getSubmissions(),
            api.getForms(),
          ]);
          setSubmissions(submissionsData);
          setForms(formsData);
        }
      } catch {
        toast({
          title: t('common.error'),
          description: t('submissions.toast.loadError'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [formId, toast, t]);

  const filteredSubmissions = useMemo(() => {
    if (formId || filterFormId === 'all') return submissions;
    return submissions.filter((s) => s.formId === parseInt(filterFormId));
  }, [submissions, filterFormId, formId]);

  const formatDate = (dateString: string) =>
    formatDateForLocale(dateString, i18n.language, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const formatFullDate = (dateString: string) =>
    formatDateForLocale(dateString, i18n.language, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const activeForm = form || selectedForm;
  const fieldLabels = getFieldLabels(activeForm?.fieldsJson);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {t('common.loadingSubmissions')}
          </div>
        </div>
      </div>
    );
  }

  const subtitle = filteredSubmissions.length > 0
    ? t('common.submissionsCount', { count: filteredSubmissions.length })
    : form
      ? t('submissions.subtitleForm')
      : t('submissions.subtitleAll');

  const emptyDescription = form
    ? t('submissions.emptyDescForm')
    : filterFormId !== 'all'
      ? t('submissions.emptyDescFiltered')
      : t('submissions.emptyDescAll');

  return (
    <div className="p-6">
      {formId ? (
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/forms')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('submissions.backToForms')}
        </Button>
      ) : null}

      <PageHeader
        title={form ? form.name : t('submissions.titleAll')}
        subtitle={subtitle}
        actions={(
          <div className="flex items-center gap-3">
            {!formId && forms.length > 0 ? (
              <Select value={filterFormId} onValueChange={setFilterFormId}>
                <SelectTrigger className="w-[200px] bg-background">
                  <SelectValue placeholder={t('submissions.filterByForm')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('submissions.allForms')}</SelectItem>
                  {forms.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {formId ? (
              <Button variant="outline" onClick={() => navigate(`/forms/${formId}/edit`)}>
                <Pencil className="w-4 h-4 mr-2" />
                {t('submissions.editForm')}
              </Button>
            ) : null}
          </div>
        )}
        className="mb-6"
      />

      {filteredSubmissions.length === 0 ? (
        <EmptyStateCard
          className="border-dashed border-2"
          headerClassName="py-12"
          contentClassName="pb-8"
          iconWrapperClassName="w-16 h-16 rounded-full bg-muted/50 mb-4"
          icon={<ClipboardList className="w-8 h-8 text-muted-foreground" />}
          title={t('submissions.emptyTitle')}
          description={emptyDescription}
          descriptionClassName="max-w-sm mx-auto"
          action={form ? (
            <Button
              variant="outline"
              onClick={() => {
                const url = `${window.location.origin}/f/${form.publicId}`;
                navigator.clipboard.writeText(url);
                toast({
                  title: t('submissions.copyToastTitle'),
                  description: t('submissions.copyToastDesc'),
                });
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              {t('submissions.copyFormLink')}
            </Button>
          ) : null}
        />
      ) : (
        <Card>
          <SubmissionsTable
            submissions={filteredSubmissions}
            formId={formId}
            onSelect={handleSelectSubmission}
            formatDate={formatDate}
            workspaceUrl={user?.workspaceUrl}
          />
        </Card>
      )}

      <SubmissionDetailDialog
        open={selectedSubmission !== null}
        onOpenChange={(open) => {
          if (!open) {
            handleSelectSubmission(null);
          }
        }}
        submission={selectedSubmission}
        fieldLabels={fieldLabels}
        workspaceUrl={user?.workspaceUrl}
        formatFullDate={formatFullDate}
      />
    </div>
  );
}
