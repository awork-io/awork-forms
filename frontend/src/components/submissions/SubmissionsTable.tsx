import type { Submission } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SubmissionStatusBadge } from '@/components/submissions/SubmissionStatusBadge';
import { SubmissionAworkLinks } from '@/components/submissions/SubmissionAworkLinks';
import { getSubmissionPreview } from '@/components/submissions/submission-utils';

interface SubmissionsTableProps {
  submissions: Submission[];
  formId?: string;
  onSelect: (submission: Submission) => void;
  formatDate: (dateString: string) => string;
  workspaceUrl?: string | null;
}

export function SubmissionsTable({
  submissions,
  formId,
  onSelect,
  formatDate,
  workspaceUrl,
}: SubmissionsTableProps) {
  const { t } = useTranslation();

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          {!formId ? (
            <TableHead className="font-semibold">{t('submissions.table.form')}</TableHead>
          ) : null}
          <TableHead className="font-semibold">{t('submissions.table.dataPreview')}</TableHead>
          <TableHead className="font-semibold">{t('submissions.table.status')}</TableHead>
          <TableHead className="font-semibold">{t('submissions.table.awork')}</TableHead>
          <TableHead className="font-semibold">{t('submissions.table.submitted')}</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {submissions.map((submission) => (
          <TableRow
            key={submission.id}
            className="cursor-pointer hover:bg-muted/30"
            onClick={() => onSelect(submission)}
          >
            {!formId ? (
              <TableCell>
                <Link
                  to={`/forms/${submission.formId}/submissions`}
                  className="font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {submission.formName}
                </Link>
              </TableCell>
            ) : null}
            <TableCell className="max-w-[250px]">
              <span className="text-muted-foreground truncate block">
                {getSubmissionPreview(submission.dataJson)}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <SubmissionStatusBadge status={submission.status} />
                {submission.errorMessage ? (
                  <span title={submission.errorMessage}>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </span>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <SubmissionAworkLinks
                workspaceUrl={workspaceUrl}
                aworkProjectId={submission.aworkProjectId}
                aworkTaskId={submission.aworkTaskId}
              />
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
                  onSelect(submission);
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
