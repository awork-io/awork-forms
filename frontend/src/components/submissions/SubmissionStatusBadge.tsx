import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SubmissionStatusBadgeProps {
  status: string;
}

export function SubmissionStatusBadge({ status }: SubmissionStatusBadgeProps) {
  const { t } = useTranslation();

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
}
