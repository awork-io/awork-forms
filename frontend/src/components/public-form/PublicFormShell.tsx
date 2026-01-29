import type { ReactNode } from 'react';
import { AWORK_GRADIENT } from '@/components/public-form/constants';

interface PublicFormShellProps {
  backgroundColor: string;
  progress: number;
  showProgress: boolean;
  children: ReactNode;
}

export function PublicFormShell({
  backgroundColor,
  progress,
  showProgress,
  children,
}: PublicFormShellProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor }}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 1; }
          50% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 1; }
        }
      `}</style>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/3 -right-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: AWORK_GRADIENT }}
        />
        <div
          className="absolute -bottom-1/3 -left-1/4 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #4d9aff 0%, #a157f6 100%)' }}
        />
      </div>

      <div className="relative min-h-screen flex flex-col">
        {showProgress ? (
          <div className="fixed top-0 left-0 right-0 z-50">
            <div className="h-1 bg-gray-200/50 backdrop-blur-sm">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: AWORK_GRADIENT,
                }}
              />
            </div>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
