import { useTranslation } from 'react-i18next';

interface PublicFormLoadingProps {
  backgroundColor: string;
}

export function PublicFormLoading({ backgroundColor }: PublicFormLoadingProps) {
  const { t } = useTranslation();

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor }}
    >
      <div className="animate-pulse text-gray-500">{t('publicForm.loading')}</div>
    </div>
  );
}
