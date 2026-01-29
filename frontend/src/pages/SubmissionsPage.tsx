import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, type Submission, type Form, type FormDetail } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { isFileValue, formatFileSize, getFieldLabels } from '@/lib/form-types';
import { useAuth } from '@/contexts/AuthContext';

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

  const getAworkUrl = (path: string) => {
    const baseUrl = user?.workspaceUrl || 'https://app.awork.com';
    return `${baseUrl}/${path}`;
  };

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

  // Filter submissions by selected form
  const filteredSubmissions = useMemo(() => {
    if (formId || filterFormId === 'all') return submissions;
    return submissions.filter((s) => s.formId === parseInt(filterFormId));
  }, [submissions, filterFormId, formId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(i18n.language || 'en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            {t('submissions.status.completed')}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            {t('submissions.status.failed')}
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="secondary">
            {t('submissions.status.pending')}
          </Badge>
        );
    }
  };

  const parseSubmissionData = (dataJson: string): Record<string, unknown> => {
    try {
      return JSON.parse(dataJson);
    } catch {
      return {};
    }
  };

  const activeForm = form || selectedForm;
  const fieldLabels = getFieldLabels(activeForm?.fieldsJson);

  const getSubmissionPreview = (dataJson: string): string => {
    const data = parseSubmissionData(dataJson);
    const entries = Object.entries(data);
    if (entries.length === 0) return t('submissions.noData');

    const preview = entries
      .slice(0, 2)
      .map(([, value]) => {
        if (isFileValue(value)) {
          return value.fileName;
        }
        const strValue = String(value);
        return strValue.length > 30 ? strValue.substring(0, 30) + '...' : strValue;
      })
      .join(', ');

    return preview || t('submissions.noData');
  };

  const renderFieldValue = (value: unknown) => {
    if (isFileValue(value)) {
      const fileSize = formatFileSize(value.fileSize);
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border">
            <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <div className="min-w-0 flex-1">
              <a
                href={value.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline truncate block"
              >
                {value.fileName}
              </a>
              {fileSize && (
                <span className="text-xs text-muted-foreground">{fileSize}</span>
              )}
            </div>
            <a
              href={value.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-muted rounded"
              title={t('submissions.downloadFile')}
            >
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex items-center gap-1.5 ${value ? 'text-green-700' : 'text-muted-foreground'}`}>
          {value ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {value ? t('common.yes') : t('common.no')}
        </span>
      );
    }

    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic">{t('submissions.emptyValue')}</span>;
    }

    if (Array.isArray(value)) {
      return <span className="break-words">{value.join(', ')}</span>;
    }

    if (typeof value === 'object') {
      return (
        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return <span className="break-words">{String(value)}</span>;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{t('common.loadingSubmissions')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {formId && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto"
                onClick={() => navigate('/forms')}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('submissions.backToForms')}
              </Button>
            )}
          </div>
          <h1 className="text-2xl font-semibold">
            {form ? t('submissions.titleForm', { name: form.name }) : t('submissions.titleAll')}
          </h1>
          <p className="text-muted-foreground">
            {form
              ? t('submissions.subtitleForm')
              : t('submissions.subtitleAll')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Form filter dropdown - only show when viewing all submissions */}
          {!formId && forms.length > 0 && (
            <Select value={filterFormId} onValueChange={setFilterFormId}>
              <SelectTrigger className="w-[200px]">
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
          )}
          {formId && (
            <Button variant="outline" onClick={() => navigate(`/forms/${formId}/edit`)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t('submissions.editForm')}
            </Button>
          )}
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <CardTitle>{t('submissions.emptyTitle')}</CardTitle>
            <CardDescription>
              {form
                ? t('submissions.emptyDescForm')
                : filterFormId !== 'all'
                  ? t('submissions.emptyDescFiltered')
                  : t('submissions.emptyDescAll')}
            </CardDescription>
          </CardHeader>
          {form && (
            <CardContent className="text-center">
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
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {t('submissions.copyFormLink')}
              </Button>
            </CardContent>
          )}
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {!formId && <TableHead>{t('submissions.table.form')}</TableHead>}
                  <TableHead>{t('submissions.table.dataPreview')}</TableHead>
                  <TableHead>{t('submissions.table.status')}</TableHead>
                  <TableHead>{t('submissions.table.awork')}</TableHead>
                  <TableHead>{t('submissions.table.submitted')}</TableHead>
                  <TableHead className="w-[100px]">{t('submissions.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    {!formId && (
                      <TableCell>
                        <Link
                          to={`/forms/${submission.formId}/submissions`}
                          className="text-primary hover:underline font-medium"
                        >
                          {submission.formName}
                        </Link>
                      </TableCell>
                    )}
                    <TableCell className="max-w-[300px] truncate">
                      {getSubmissionPreview(submission.dataJson)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(submission.status)}
                      {submission.errorMessage && (
                        <span
                          className="ml-2 text-muted-foreground cursor-help"
                          title={submission.errorMessage}
                        >
                          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {submission.aworkProjectId && (
                          <a
                            href={getAworkUrl(`projects/${submission.aworkProjectId}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            {t('submissions.project')}
                          </a>
                        )}
                        {submission.aworkTaskId && (
                          <a
                            href={getAworkUrl(`tasks/${submission.aworkTaskId}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            {t('submissions.task')}
                          </a>
                        )}
                        {!submission.aworkProjectId && !submission.aworkTaskId && (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(submission.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectSubmission(submission)}
                      >
                        {t('submissions.view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Submission Detail Dialog */}
      <Dialog open={selectedSubmission !== null} onOpenChange={() => handleSelectSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('submissions.detailsTitle')}</DialogTitle>
            <DialogDescription>
              {selectedSubmission && t('submissions.submittedOn', { date: formatDate(selectedSubmission.createdAt) })}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">{t('submissions.statusLabel')}</span>
                  <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
                </div>
                {selectedSubmission.errorMessage && (
                  <div className="flex-1">
                    <span className="text-sm text-muted-foreground">{t('submissions.errorLabel')}</span>
                    <p className="mt-1 text-sm text-destructive">{selectedSubmission.errorMessage}</p>
                  </div>
                )}
              </div>

              {(selectedSubmission.aworkProjectId || selectedSubmission.aworkTaskId) && (
                <div>
                  <span className="text-sm text-muted-foreground">{t('submissions.aworkLinks')}</span>
                  <div className="mt-1 flex gap-2">
                    {selectedSubmission.aworkProjectId && (
                      <a
                        href={getAworkUrl(`projects/${selectedSubmission.aworkProjectId}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {t('submissions.viewProject')}
                      </a>
                    )}
                    {selectedSubmission.aworkTaskId && (
                      <a
                        href={getAworkUrl(`tasks/${selectedSubmission.aworkTaskId}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {t('submissions.viewTask')}
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-foreground">{t('submissions.submittedData')}</span>
                <div className="mt-3 space-y-3">
                  {Object.entries(parseSubmissionData(selectedSubmission.dataJson)).map(([key, value]) => (
                    <div key={key} className="bg-muted/50 rounded-lg p-4 border border-border/50">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        {fieldLabels[key] || key}
                      </div>
                      <div className="text-sm">
                        {renderFieldValue(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
