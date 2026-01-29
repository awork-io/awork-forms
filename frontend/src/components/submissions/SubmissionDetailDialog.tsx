import type { Submission } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Calendar, Check, Download, FileText, Paperclip, X } from 'lucide-react';
import { isFileValue, formatFileSize } from '@/lib/form-types';
import { SubmissionAworkLinks } from '@/components/submissions/SubmissionAworkLinks';
import { SubmissionStatusBadge } from '@/components/submissions/SubmissionStatusBadge';
import { parseSubmissionData } from '@/components/submissions/submission-utils';

interface SubmissionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: Submission | null;
  fieldLabels: Record<string, string>;
  workspaceUrl?: string | null;
  formatFullDate: (dateString: string) => string;
}

export function SubmissionDetailDialog({
  open,
  onOpenChange,
  submission,
  fieldLabels,
  workspaceUrl,
  formatFullDate,
}: SubmissionDetailDialogProps) {
  const { t } = useTranslation();

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
            {fileSize ? (
              <span className="text-xs text-muted-foreground">{fileSize}</span>
            ) : null}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('submissions.detailsTitle')}
          </DialogTitle>
          <DialogDescription>
            {submission ? (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {t('submissions.submittedOn', { date: formatFullDate(submission.createdAt) })}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        {submission ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              <SubmissionStatusBadge status={submission.status} />
              <SubmissionAworkLinks
                workspaceUrl={workspaceUrl}
                aworkProjectId={submission.aworkProjectId}
                aworkTaskId={submission.aworkTaskId}
                size="md"
                showLabels
              />
            </div>

            {submission.errorMessage ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">{t('submissions.errorLabel')}</p>
                    <p className="text-sm text-red-700 mt-0.5">{submission.errorMessage}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">{t('submissions.submittedData')}</h3>
              <div className="space-y-3">
                {Object.entries(parseSubmissionData(submission.dataJson)).map(([key, value]) => (
                  <div key={key} className="rounded-lg border bg-card overflow-hidden">
                    <div className="px-4 py-2 bg-muted/50 border-b">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {fieldLabels[key] || key}
                      </span>
                    </div>
                    <div className="px-4 py-3 text-sm">{renderFieldValue(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
