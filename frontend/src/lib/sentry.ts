import * as Sentry from '@sentry/react';

export interface FrontendSentryEnv {
  MODE?: string;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_ENVIRONMENT?: string;
  VITE_SENTRY_RELEASE?: string;
}

export interface FrontendSentryConfig {
  enabled: boolean;
  dsn?: string;
  environment: string;
  release?: string;
}

export function getFrontendSentryConfig(env: FrontendSentryEnv): FrontendSentryConfig {
  const dsn = env.VITE_SENTRY_DSN?.trim();

  return {
    enabled: Boolean(dsn),
    dsn: dsn || undefined,
    environment: env.VITE_SENTRY_ENVIRONMENT || env.MODE || 'development',
    release: env.VITE_SENTRY_RELEASE || undefined,
  };
}

export function initFrontendSentry(env: FrontendSentryEnv = import.meta.env): void {
  const config = getFrontendSentryConfig(env);
  if (!config.enabled || !config.dsn) return;

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
  });
}
