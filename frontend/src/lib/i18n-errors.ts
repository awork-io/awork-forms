import type { TFunction } from 'i18next';

const ERROR_KEY_MAP: Record<string, string> = {
  Unauthorized: 'errors.unauthorized',
  'Request failed': 'errors.requestFailed',
  'Upload failed': 'errors.uploadFailed',
  'Form not found': 'errors.formNotFound',
  'Submission failed': 'errors.submissionFailed',
  'Authentication failed': 'errors.authFailed',
};

export function getErrorMessage(
  error: unknown,
  t: TFunction,
  fallbackKey: string
): string {
  if (error instanceof Error) {
    const key = ERROR_KEY_MAP[error.message];
    if (key) {
      return t(key);
    }
  }

  return t(fallbackKey);
}
