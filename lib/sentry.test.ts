import { afterEach, describe, expect, it } from 'vitest';

import { getSentryBrowserInitConfig, sanitizeEvent, shouldIgnoreException } from './sentry';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('web sentry config', () => {
  it('redacts sensitive payloads before sending', () => {
    const sanitized = sanitizeEvent({
      request: {
        url: 'https://example.com/api/test?token=secret-token&plot=alpha',
        headers: {
          authorization: 'Bearer secret-token',
          cookie: 'session=abc',
        },
        data: {
          email: 'farmer@example.com',
          note: 'keep-me',
        },
      },
      user: {
        id: 'user_123',
        email: 'farmer@example.com',
      },
      extra: {
        api_key: 'secret',
        note: 'still-here',
      },
      breadcrumbs: [
        {
          message: 'POST /api/test',
          data: {
            authorization: 'Bearer secret-token',
            path: '/api/test',
          },
        },
      ],
    } as never);

    expect(sanitized?.user).toEqual({ id: 'user_123' });
    expect(String(sanitized?.request?.url)).not.toContain('secret-token');
    expect((sanitized?.request?.headers as Record<string, string>).authorization).toBe('[REDACTED]');
    expect((sanitized?.request?.data as Record<string, string>).email).toBe('[REDACTED]');
    expect((sanitized?.extra as Record<string, string>).api_key).toBe('[REDACTED]');
    expect((sanitized?.breadcrumbs?.[0]?.data as Record<string, string>).authorization).toBe('[REDACTED]');
  });

  it('ignores expected operational errors', () => {
    expect(shouldIgnoreException({ name: 'AbortError', message: 'The operation was aborted' })).toBe(true);
    expect(shouldIgnoreException({ status: 422, message: 'Validation failed' })).toBe(true);
    expect(shouldIgnoreException(new Error('Unexpected failure'))).toBe(false);
  });

  it('uses production-safe browser defaults when env overrides are absent', () => {
    process.env.SENTRY_ENVIRONMENT = 'production';
    delete process.env.NEXT_PUBLIC_SENTRY_ERROR_SAMPLE_RATE;
    delete process.env.SENTRY_ERROR_SAMPLE_RATE;
    delete process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE;
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    delete process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE;
    delete process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE;

    const config = getSentryBrowserInitConfig();

    expect(config.sampleRate).toBe(0.2);
    expect(config.tracesSampleRate).toBe(0.1);
    expect(config.replaysSessionSampleRate).toBe(0.05);
    expect(config.replaysOnErrorSampleRate).toBe(0.5);
    expect(config.sendDefaultPii).toBe(false);
  });
});
