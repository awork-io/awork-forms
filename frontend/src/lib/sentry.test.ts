import { describe, expect, it, vi, beforeEach } from 'vitest';

const { sentryInitMock, sentrySetUserMock } = vi.hoisted(() => ({
  sentryInitMock: vi.fn(),
  sentrySetUserMock: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  init: sentryInitMock,
  setUser: sentrySetUserMock,
}));

import { getFrontendSentryConfig, initFrontendSentry, setSentryUser } from './sentry';

describe('frontend sentry config', () => {
  beforeEach(() => {
    sentryInitMock.mockReset();
    globalThis.fetch = vi.fn();
  });

  it('disables sentry when no DSN is configured', () => {
    const config = getFrontendSentryConfig({ MODE: 'development' });

    expect(config.enabled).toBe(false);
    expect(config.environment).toBe('development');
  });

  it('initializes sentry only when DSN is set', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
    } as unknown as Response);

    await initFrontendSentry({
      MODE: 'production',
      VITE_SENTRY_DSN: 'https://key@o0.ingest.sentry.io/1',
      VITE_SENTRY_ENVIRONMENT: 'staging',
      VITE_SENTRY_RELEASE: 'awork-forms@1.2.3',
    });

    expect(sentryInitMock).toHaveBeenCalledWith({
      dsn: 'https://key@o0.ingest.sentry.io/1',
      environment: 'staging',
      release: 'awork-forms@1.2.3',
      tracesSampleRate: 1.0,
    });
  });

  it('does not initialize sentry when dsn is blank', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
    } as unknown as Response);

    await initFrontendSentry({
      MODE: 'production',
      VITE_SENTRY_DSN: '   ',
    });

    expect(sentryInitMock).not.toHaveBeenCalled();
  });

  it('uses runtime app config before vite env', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        sentryDsn: 'https://runtime@o0.ingest.sentry.io/1',
        sentryEnvironment: 'runtime-env',
        sentryRelease: 'runtime-release',
      }),
    } as unknown as Response);

    await initFrontendSentry({
      MODE: 'production',
      VITE_SENTRY_DSN: 'https://vite@o0.ingest.sentry.io/2',
      VITE_SENTRY_ENVIRONMENT: 'vite-env',
      VITE_SENTRY_RELEASE: 'vite-release',
    });

    expect(sentryInitMock).toHaveBeenCalledWith({
      dsn: 'https://runtime@o0.ingest.sentry.io/1',
      environment: 'runtime-env',
      release: 'runtime-release',
      tracesSampleRate: 1.0,
    });
  });

  it('sets sentry user with id, email, and workspace_id', () => {
    setSentryUser({ id: 'u1', email: 'a@b.com', workspaceId: 'ws1' });
    expect(sentrySetUserMock).toHaveBeenCalledWith({ id: 'u1', email: 'a@b.com', workspace_id: 'ws1' });
  });

  it('clears sentry user when null', () => {
    setSentryUser(null);
    expect(sentrySetUserMock).toHaveBeenCalledWith(null);
  });
});
