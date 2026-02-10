import * as Sentry from '@sentry/react';

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

export async function initFrontendSentry(env: FrontendSentryEnv = import.meta.env): Promise<void> {
  const runtimeConfig = await fetchRuntimeSentryConfig();
  const config = getFrontendSentryConfig(env, runtimeConfig);
  if (!config.enabled || !config.dsn) return;

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
  });
}
