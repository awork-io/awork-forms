import type { SubmissionResponse } from '@/lib/api';
import { useTranslation } from 'react-i18next';

interface PublicFormSuccessStateProps {
  backgroundColor: string;
  primaryColor: string;
  submissionResult: SubmissionResponse | null;
}

export function PublicFormSuccessState({
  backgroundColor,
  primaryColor,
  submissionResult,
}: PublicFormSuccessStateProps) {
  const { t } = useTranslation();
  const hasIntegrationError = submissionResult?.integrationStatus === 'failed';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-500">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300"
          style={{ backgroundColor: hasIntegrationError ? '#fef3c7' : `${primaryColor}20` }}
        >
          {hasIntegrationError ? (
            <svg
              className="w-10 h-10 animate-in zoom-in duration-500 delay-200 text-amber-500"
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
          ) : (
            <svg
              className="w-10 h-10 animate-in zoom-in duration-500 delay-200"
              style={{ color: primaryColor }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {hasIntegrationError ? t('publicForm.submissionReceived') : t('publicForm.thankYou')}
        </h2>
        <p className="text-gray-500 text-lg">{t('publicForm.submissionSuccess')}</p>

        {hasIntegrationError ? (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {t('publicForm.integrationNoticeTitle')}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {t('publicForm.integrationNoticeBody')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative h-8 mt-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-bounce"
                style={{
                  backgroundColor: primaryColor,
                  left: `${20 + i * 15}%`,
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0.6 + i * 0.1,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
