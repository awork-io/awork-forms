import { describe, expect, it, vi, beforeEach } from 'vitest';

const { sentryInitMock, sentrySetUserMock } = vi.hoisted(() => ({
  sentryInitMock: vi.fn(),
  sentrySetUserMock: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  init: sentryInitMock,
  setUser: sentrySetUserMock,
}));

import {
  getFrontendSentryConfig,
  initFrontendSentry,
  setSentryUser,
  shouldIgnoreThirdPartySafariAutofillError,
} from './sentry';

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

    expect(sentryInitMock).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://key@o0.ingest.sentry.io/1',
      environment: 'staging',
      release: 'awork-forms@1.2.3',
      tracesSampleRate: 1.0,
      beforeSend: expect.any(Function),
    }));
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

    expect(sentryInitMock).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://runtime@o0.ingest.sentry.io/1',
      environment: 'runtime-env',
      release: 'runtime-release',
      tracesSampleRate: 1.0,
      beforeSend: expect.any(Function),
    }));
  });

  it('ignores Safari autofill errors from masked third-party frames', () => {
    const event = {
      type: undefined,
      exception: {
        values: [
          {
            type: 'TypeError',
            value: "null is not an object (evaluating 'autofillFieldData.autoCompleteType.includes')",
            stacktrace: {
              frames: [
                { filename: 'webkit-masked-url://hidden/', function: 'setupOverlayOnField' },
                { filename: '[native code]', function: 'Promise' },
              ],
            },
          },
        ],
      },
    } satisfies Parameters<typeof shouldIgnoreThirdPartySafariAutofillError>[0];

    expect(shouldIgnoreThirdPartySafariAutofillError(event)).toBe(true);
  });

  it('keeps application errors with real app frames', () => {
    const event = {
      type: undefined,
      exception: {
        values: [
          {
            type: 'TypeError',
            value: "Cannot read properties of undefined (reading 'id')",
            stacktrace: {
              frames: [
                { filename: 'https://forms.awork.com/assets/index.js', function: 'renderField' },
                { filename: 'https://forms.awork.com/assets/index.js', function: 'handleSave' },
              ],
            },
          },
        ],
      },
    } satisfies Parameters<typeof shouldIgnoreThirdPartySafariAutofillError>[0];

    expect(shouldIgnoreThirdPartySafariAutofillError(event)).toBe(false);
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
