import { ClipboardList, ExternalLink, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SubmissionAworkLinksProps {
  workspaceUrl?: string | null;
  aworkProjectId?: number | null;
  aworkTaskId?: number | null;
  size?: 'sm' | 'md';
  showLabels?: boolean;
}

export function SubmissionAworkLinks({
  workspaceUrl,
  aworkProjectId,
  aworkTaskId,
  size = 'sm',
  showLabels = false,
}: SubmissionAworkLinksProps) {
  const { t } = useTranslation();
  const baseUrl = workspaceUrl || 'https://app.awork.com';
  const paddingClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const projectClasses =
    size === 'sm'
      ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 rounded'
      : 'text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md';
  const taskClasses =
    size === 'sm'
      ? 'text-[#006dfa] bg-[#edf5ff] hover:bg-[#dbebff] rounded'
      : 'text-[#006dfa] bg-[#edf5ff] hover:bg-[#dbebff] rounded-md';

  return (
    <div className="flex items-center gap-1.5">
      {aworkProjectId ? (
        <a
          href={`${baseUrl}/projects/${aworkProjectId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 ${paddingClasses} font-medium transition-colors ${projectClasses}`}
        >
          <FolderOpen className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
          {showLabels ? t('submissions.viewProject') : null}
          <ExternalLink className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
        </a>
      ) : null}
      {aworkTaskId ? (
        <a
          href={`${baseUrl}/tasks/${aworkTaskId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 ${paddingClasses} font-medium transition-colors ${taskClasses}`}
        >
          <ClipboardList className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
          {showLabels ? t('submissions.viewTask') : null}
          <ExternalLink className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
        </a>
      ) : null}
      {!aworkProjectId && !aworkTaskId ? (
        <span className="text-muted-foreground text-sm">-</span>
      ) : null}
    </div>
  );
}
