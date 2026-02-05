import type { SubmissionResponse } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AWORK_GRADIENT } from './constants';

interface PublicFormSuccessStateProps {
  backgroundColor: string;
  primaryColor: string;
  submissionResult: SubmissionResponse | null;
}

// Floating particle animation for celebration effect
function CelebrationParticles({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full animate-float-up"
          style={{
            backgroundColor: i % 3 === 0 ? primaryColor : i % 3 === 1 ? '#60a5fa' : '#f472b6',
            left: `${8 + (i * 7.5)}%`,
            bottom: '-10px',
            animationDelay: `${i * 0.15}s`,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

export function PublicFormSuccessState({
  backgroundColor,
  primaryColor,
  submissionResult,
}: PublicFormSuccessStateProps) {
  const { t } = useTranslation();
  const hasIntegrationError = submissionResult?.integrationStatus === 'failed';

  const handleSubmitAnother = () => {
    window.location.reload();
  };

  const handleCloseTab = () => {
    window.close();
    // Fallback: If window.close() doesn't work (e.g., tab wasn't opened via script),
    // show a message or do nothing - the button will still be there
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-500 relative overflow-hidden">
        {/* Celebration particles for successful submission */}
        {!hasIntegrationError && <CelebrationParticles primaryColor={primaryColor} />}

        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: AWORK_GRADIENT }} />

        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 mt-2 animate-in zoom-in duration-300 relative"
          style={{ backgroundColor: hasIntegrationError ? '#fef3c7' : `${primaryColor}15` }}
        >
          {/* Subtle ring animation */}
          {!hasIntegrationError && (
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: primaryColor }}
            />
          )}
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
              className="w-10 h-10 animate-in zoom-in duration-500 delay-200 relative z-10"
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

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {hasIntegrationError ? t('publicForm.submissionReceived') : t('publicForm.thankYou')}
        </h2>
        <p className="text-gray-500 text-base mb-6">{t('publicForm.submissionSuccess')}</p>

        {hasIntegrationError && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
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
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 relative z-10">
          <Button
            onClick={handleSubmitAnother}
            className="w-full h-11 text-base font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: AWORK_GRADIENT,
              color: 'white',
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('publicForm.submitAnother')}
          </Button>

          <button
            onClick={handleCloseTab}
            className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {t('publicForm.closeTab')}
          </button>
        </div>

        {/* Powered by footer */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {t('publicForm.poweredByPrefix')}{' '}
            <a
              href="https://awork.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-500 hover:text-blue-600 transition-colors"
            >
              {t('brand.full')}
            </a>
          </p>
        </div>
      </div>

      {/* Custom keyframes for float animation */}
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-400px) scale(0);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: float-up 3s ease-out infinite;
        }
      `}</style>
    </div>
  );
}
