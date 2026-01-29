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
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  ClipboardList,
  Copy,
  Pencil,
  Eye,
  Paperclip,
  Download,
  Check,
  X,
  Info,
} from 'lucide-react';

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

  const filteredSubmissions = useMemo(() => {
    if (formId || filterFormId === 'all') return submissions;
    return submissions.filter((s) => s.formId === parseInt(filterFormId));
  }, [submissions, filterFormId, formId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(i18n.language || 'en', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatFullDate = (dateString: string) => {
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
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {t('submissions.status.completed')}
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 gap-1">
            <AlertCircle className="w-3 h-3" />
            {t('submissions.status.failed')}
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 gap-1">
            <Clock className="w-3 h-3" />
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
    if (entries.length === 0) return '-';

    const preview = entries.slice(0, 2).map(([, value]) => {
      if (isFileValue(value)) return value.fileName;
      const strValue = String(value);
      return strValue.length > 25 ? strValue.substring(0, 25) + '...' : strValue;
    });

    return preview.join(', ');
  };

  const renderFieldValue = (value: unknown) => {
    if (isFileValue(value)) {
      const fileSize = formatFileSize(value.fileSize);
      return (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <div className="p-2 bg-background rounded-md border">
            <Paperclip className="w-4 h-4 text-muted-foreground" />
          </div>
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
            className="p-2 hover:bg-muted rounded-md transition-colors"
            title={t('submissions.downloadFile')}
          >
            <Download className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex items-center gap-1.5 ${value ? 'text-emerald-700' : 'text-muted-foreground'}`}>
          {value ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {value ? t('common.yes') : t('common.no')}
        </span>
      );
    }

    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic">{t('submissions.emptyValue')}</span>;
    }

    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {String(item)}
            </Badge>
          ))}
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono">
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
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {t('common.loadingSubmissions')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          {formId && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/forms')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('submissions.backToForms')}
            </Button>
          )}
          <h1 className="text-2xl font-bold tracking-tight">
            {form ? form.name : t('submissions.titleAll')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {filteredSubmissions.length > 0
              ? t('common.submissionsCount', { count: filteredSubmissions.length })
              : form
                ? t('submissions.subtitleForm')
                : t('submissions.subtitleAll')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!formId && forms.length > 0 && (
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
          )}
          {formId && (
            <Button variant="outline" onClick={() => navigate(`/forms/${formId}/edit`)}>
              <Pencil className="w-4 h-4 mr-2" />
              {t('submissions.editForm')}
            </Button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredSubmissions.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardHeader className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">{t('submissions.emptyTitle')}</CardTitle>
            <CardDescription className="max-w-sm mx-auto">
              {form
                ? t('submissions.emptyDescForm')
                : filterFormId !== 'all'
                  ? t('submissions.emptyDescFiltered')
                  : t('submissions.emptyDescAll')}
            </CardDescription>
          </CardHeader>
          {form && (
            <CardContent className="text-center pb-8">
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
            </CardContent>
          )}
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {!formId && (
                  <TableHead className="font-semibold">{t('submissions.table.form')}</TableHead>
                )}
                <TableHead className="font-semibold">{t('submissions.table.dataPreview')}</TableHead>
                <TableHead className="font-semibold">{t('submissions.table.status')}</TableHead>
                <TableHead className="font-semibold">{t('submissions.table.awork')}</TableHead>
                <TableHead className="font-semibold">{t('submissions.table.submitted')}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.map((submission) => (
                <TableRow
                  key={submission.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => handleSelectSubmission(submission)}
                >
                  {!formId && (
                    <TableCell>
                      <Link
                        to={`/forms/${submission.formId}/submissions`}
                        className="font-medium text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {submission.formName}
                      </Link>
                    </TableCell>
                  )}
                  <TableCell className="max-w-[250px]">
                    <span className="text-muted-foreground truncate block">
                      {getSubmissionPreview(submission.dataJson)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(submission.status)}
                      {submission.errorMessage && (
                        <span title={submission.errorMessage}>
                          <Info className="w-3.5 h-3.5 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {submission.aworkProjectId && (
                        <a
                          href={getAworkUrl(`projects/${submission.aworkProjectId}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FolderOpen className="w-3 h-3" />
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {submission.aworkTaskId && (
                        <a
                          href={getAworkUrl(`tasks/${submission.aworkTaskId}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#006dfa] bg-[#edf5ff] hover:bg-[#dbebff] rounded transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ClipboardList className="w-3 h-3" />
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {!submission.aworkProjectId && !submission.aworkTaskId && (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(submission.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSubmission(submission);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Submission Detail Dialog */}
      <Dialog open={selectedSubmission !== null} onOpenChange={() => handleSelectSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t('submissions.detailsTitle')}
            </DialogTitle>
            <DialogDescription>
              {selectedSubmission && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {t('submissions.submittedOn', { date: formatFullDate(selectedSubmission.createdAt) })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-6">
              {/* Status and links */}
              <div className="flex items-center gap-3 flex-wrap">
                {getStatusBadge(selectedSubmission.status)}
                {selectedSubmission.aworkProjectId && (
                  <a
                    href={getAworkUrl(`projects/${selectedSubmission.aworkProjectId}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    {t('submissions.viewProject')}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {selectedSubmission.aworkTaskId && (
                  <a
                    href={getAworkUrl(`tasks/${selectedSubmission.aworkTaskId}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#006dfa] bg-[#edf5ff] hover:bg-[#dbebff] rounded-md transition-colors"
                  >
                    <ClipboardList className="w-4 h-4" />
                    {t('submissions.viewTask')}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Error */}
              {selectedSubmission.errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">{t('submissions.errorLabel')}</p>
                      <p className="text-sm text-red-700 mt-0.5">{selectedSubmission.errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submitted data */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">{t('submissions.submittedData')}</h3>
                <div className="space-y-3">
                  {Object.entries(parseSubmissionData(selectedSubmission.dataJson)).map(([key, value]) => (
                    <div key={key} className="rounded-lg border bg-card overflow-hidden">
                      <div className="px-4 py-2 bg-muted/50 border-b">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {fieldLabels[key] || key}
                        </span>
                      </div>
                      <div className="px-4 py-3 text-sm">
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
