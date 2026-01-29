import { useTranslation } from 'react-i18next';

interface PublicFormErrorStateProps {
  backgroundColor: string;
  error: string;
}

export function PublicFormErrorState({ backgroundColor, error }: PublicFormErrorStateProps) {
  const { t } = useTranslation();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('publicForm.notAvailableTitle')}</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );
}
