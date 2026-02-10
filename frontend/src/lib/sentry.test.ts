import { describe, expect, it, vi, beforeEach } from 'vitest';

const { sentryInitMock } = vi.hoisted(() => ({
  sentryInitMock: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  init: sentryInitMock,
}));

import { getFrontendSentryConfig, initFrontendSentry } from './sentry';

describe('frontend sentry config', () => {
  beforeEach(() => {
    sentryInitMock.mockReset();
  });

  it('disables sentry when no DSN is configured', () => {
    const config = getFrontendSentryConfig({ MODE: 'development' });

    expect(config.enabled).toBe(false);
    expect(config.environment).toBe('development');
  });

  it('initializes sentry only when DSN is set', () => {
    initFrontendSentry({
      MODE: 'production',
      VITE_SENTRY_DSN: 'https://key@o0.ingest.sentry.io/1',
      VITE_SENTRY_ENVIRONMENT: 'staging',
      VITE_SENTRY_RELEASE: 'awork-forms@1.2.3',
    });

    expect(sentryInitMock).toHaveBeenCalledWith({
      dsn: 'https://key@o0.ingest.sentry.io/1',
      environment: 'staging',
      release: 'awork-forms@1.2.3',
    });
  });

  it('does not initialize sentry when dsn is blank', () => {
    initFrontendSentry({
      MODE: 'production',
      VITE_SENTRY_DSN: '   ',
    });

    expect(sentryInitMock).not.toHaveBeenCalled();
  });
});
