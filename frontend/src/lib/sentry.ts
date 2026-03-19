import * as Sentry from '@sentry/react';
import type { ErrorEvent, Exception, StackFrame } from '@sentry/react';

export interface FrontendSentryEnv {
  MODE?: string;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_ENVIRONMENT?: string;
  VITE_SENTRY_RELEASE?: string;
}

export interface RuntimeSentryConfig {
  sentryDsn?: string;
  sentryEnvironment?: string;
  sentryRelease?: string;
}

export interface FrontendSentryConfig {
  enabled: boolean;
  dsn?: string;
  environment: string;
  release?: string;
}

const SAFARI_MASKED_URL_PREFIX = 'webkit-masked-url://hidden/';

function getExceptionFrames(exception: Exception): StackFrame[] {
  return exception.stacktrace?.frames || [];
}

function hasOnlySafariMaskedFrames(exception: Exception) {
  const frames = getExceptionFrames(exception);
  return frames.length > 0 && frames.every((frame) => {
    const filename = frame.filename || frame.abs_path;
    return filename === '[native code]' || filename?.startsWith(SAFARI_MASKED_URL_PREFIX);
  });
}

export function shouldIgnoreThirdPartySafariAutofillError(event: ErrorEvent): boolean {
  const exceptions = event.exception?.values || [];
  if (exceptions.length === 0) return false;

  const combinedMessage = exceptions
    .map((exception) => `${exception.type || ''} ${exception.value || ''}`.toLowerCase())
    .join('\n');

  const isKnownSafariAutofillFailure = combinedMessage.includes('autofillfielddata')
    || combinedMessage.includes('autocompletetype.includes');

  return isKnownSafariAutofillFailure
    && exceptions.every((exception) => hasOnlySafariMaskedFrames(exception));
}

export async function fetchRuntimeSentryConfig(fetchImpl: typeof fetch = fetch): Promise<RuntimeSentryConfig | undefined> {
  try {
    const response = await fetchImpl('/api/app-config', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    if (!response.ok) return undefined;
    return response.json() as Promise<RuntimeSentryConfig>;
  } catch {
    return undefined;
  }
}

export function getFrontendSentryConfig(
  env: FrontendSentryEnv,
  runtimeConfig?: RuntimeSentryConfig
): FrontendSentryConfig {
  const dsn = runtimeConfig?.sentryDsn?.trim() || env.VITE_SENTRY_DSN?.trim();

  return {
    enabled: Boolean(dsn),
    dsn: dsn || undefined,
    environment: runtimeConfig?.sentryEnvironment || env.VITE_SENTRY_ENVIRONMENT || env.MODE || 'development',
    release: runtimeConfig?.sentryRelease || env.VITE_SENTRY_RELEASE || undefined,
  };
}

export function setSentryUser(user: { id: string; email: string; workspaceId: string } | null): void {
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email, workspace_id: user.workspaceId });
  } else {
    Sentry.setUser(null);
  }
}

export async function initFrontendSentry(env: FrontendSentryEnv = import.meta.env): Promise<void> {
  const runtimeConfig = await fetchRuntimeSentryConfig();
  const config = getFrontendSentryConfig(env, runtimeConfig);
  if (!config.enabled || !config.dsn) return;

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: 1.0,
    beforeSend(event) {
      if (shouldIgnoreThirdPartySafariAutofillError(event)) {
        return null;
      }

      return event;
    },
  });
}
