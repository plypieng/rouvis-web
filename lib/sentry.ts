import * as Sentry from '@sentry/nextjs';

const SENSITIVE_KEYS = [
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'passwd',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'secret',
  'email',
  'session',
];

const EXPECTED_ERROR_MESSAGES = [
  'AbortError',
  'The operation was aborted',
  'Request aborted',
];

const DEFAULT_BROWSER_SAMPLE_RATE = {
  development: 1,
  staging: 0.5,
  production: 0.2,
};

const DEFAULT_TRACE_SAMPLE_RATE = {
  development: 1,
  staging: 0.35,
  production: 0.1,
};

const DEFAULT_REPLAY_SESSION_SAMPLE_RATE = {
  development: 1,
  staging: 0.2,
  production: 0.05,
};

const DEFAULT_REPLAY_ON_ERROR_SAMPLE_RATE = {
  development: 1,
  staging: 1,
  production: 0.5,
};

type RuntimeKind = 'browser' | 'server' | 'edge';
type SentryInitOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;
type SentryBrowserInitOptions = SentryInitOptions & {
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
};
type BeforeSendHandler = NonNullable<SentryInitOptions['beforeSend']>;

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export interface CaptureContext {
  tags?: Record<string, string>;
  extra?: Record<string, JsonValue>;
  user?: {
    id?: string;
  };
  level?: 'error' | 'warning' | 'info' | 'debug' | 'fatal' | 'log';
  fingerprint?: string[];
}

function getEnvironment(): 'development' | 'staging' | 'production' {
  const raw = (process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development').toLowerCase();
  if (raw === 'production') return 'production';
  if (raw === 'staging' || raw === 'preview') return 'staging';
  return 'development';
}

function getRelease(): string | undefined {
  return process.env.SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? undefined;
}

function getBrowserDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN ?? undefined;
}

function getServerDsn(): string | undefined {
  return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? undefined;
}

function parseRate(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((candidate) => normalized.includes(candidate));
}

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const [key, currentValue] of url.searchParams.entries()) {
      if (isSensitiveKey(key)) {
        url.searchParams.set(key, '[REDACTED]');
      } else {
        url.searchParams.set(key, currentValue);
      }
    }
    return url.toString();
  } catch {
    return value;
  }
}

function sanitizeValue(value: unknown, keyHint = ''): JsonValue {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    if (keyHint === 'url' || keyHint.endsWith('_url')) {
      return sanitizeUrl(value);
    }
    return isSensitiveKey(keyHint) ? '[REDACTED]' : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, keyHint));
  }

  if (typeof value === 'object') {
    const sanitized: { [k: string]: JsonValue } = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = isSensitiveKey(key) ? '[REDACTED]' : sanitizeValue(entry, key);
    }
    return sanitized;
  }

  return String(value);
}

function extractStatusCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const status = (error as { status?: unknown; statusCode?: unknown }).status
    ?? (error as { status?: unknown; statusCode?: unknown }).statusCode;

  return typeof status === 'number' ? status : null;
}

export function shouldIgnoreException(error: unknown): boolean {
  const statusCode = extractStatusCode(error);
  if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
    return true;
  }

  const name = typeof error === 'object' && error && 'name' in error ? String((error as { name?: unknown }).name ?? '') : '';
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : typeof error === 'string'
        ? error
        : '';

  return EXPECTED_ERROR_MESSAGES.some((candidate) =>
    name.includes(candidate) || message.includes(candidate)
  );
}

export function sanitizeEvent(event: Sentry.Event, hint?: Sentry.EventHint): Sentry.Event | null {
  if (shouldIgnoreException(hint?.originalException)) {
    return null;
  }

  const sanitized: Sentry.Event = {
    ...event,
    user: event.user?.id ? { id: event.user.id } : undefined,
    request: event.request
      ? {
          ...event.request,
          url: event.request.url ? sanitizeUrl(event.request.url) : event.request.url,
          headers: sanitizeValue(event.request.headers ?? {}) as Record<string, string>,
          cookies: undefined,
          data: sanitizeValue(event.request.data ?? {}),
        }
      : event.request,
    contexts: sanitizeValue(event.contexts ?? {}) as Record<string, Record<string, unknown>>,
    extra: sanitizeValue(event.extra ?? {}) as Record<string, unknown>,
    breadcrumbs: event.breadcrumbs?.map((breadcrumb) => ({
      ...breadcrumb,
      message: breadcrumb.message ? String(sanitizeValue(breadcrumb.message, 'message')) : breadcrumb.message,
      data: sanitizeValue(breadcrumb.data ?? {}) as Record<string, unknown>,
    })),
  };

  return sanitized;
}

function createBeforeSend(runtime: RuntimeKind): BeforeSendHandler {
  return ((event, hint) => {
    const sanitized = sanitizeEvent(event as Sentry.Event, hint as Sentry.EventHint);
    if (!sanitized) {
      return null;
    }

    return {
      ...sanitized,
      tags: {
        service: 'web',
        runtime,
        ...(sanitized.tags ?? {}),
      },
    } as Parameters<BeforeSendHandler>[0];
  }) as BeforeSendHandler;
}

function createBaseConfig(runtime: RuntimeKind, dsn: string | undefined): SentryInitOptions {
  const environment = getEnvironment();

  return {
    dsn,
    enabled: Boolean(dsn),
    environment,
    release: getRelease(),
    sendDefaultPii: false,
    sampleRate: parseRate(
      process.env.NEXT_PUBLIC_SENTRY_ERROR_SAMPLE_RATE ?? process.env.SENTRY_ERROR_SAMPLE_RATE,
      DEFAULT_BROWSER_SAMPLE_RATE[environment]
    ),
    tracesSampleRate: parseRate(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? process.env.SENTRY_TRACES_SAMPLE_RATE,
      DEFAULT_TRACE_SAMPLE_RATE[environment]
    ),
    beforeSend: createBeforeSend(runtime),
    beforeBreadcrumb: (breadcrumb) => ({
      ...breadcrumb,
      data: sanitizeValue(breadcrumb.data ?? {}) as Record<string, unknown>,
      message: breadcrumb.message ? String(sanitizeValue(breadcrumb.message, 'message')) : breadcrumb.message,
    }),
    ignoreErrors: EXPECTED_ERROR_MESSAGES,
    debug: environment === 'development',
  };
}

export function getSentryBrowserInitConfig(): SentryBrowserInitOptions {
  const environment = getEnvironment();

  return {
    ...createBaseConfig('browser', getBrowserDsn()),
    replaysSessionSampleRate: parseRate(
      process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE,
      DEFAULT_REPLAY_SESSION_SAMPLE_RATE[environment]
    ),
    replaysOnErrorSampleRate: parseRate(
      process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE,
      DEFAULT_REPLAY_ON_ERROR_SAMPLE_RATE[environment]
    ),
    enableLogs: environment !== 'production',
  };
}

export function getSentryServerInitConfig(runtime: Exclude<RuntimeKind, 'browser'>): SentryInitOptions {
  const environment = getEnvironment();

  return {
    ...createBaseConfig(runtime, getServerDsn()),
    enableLogs: environment !== 'production',
  };
}

function hasEnabledDsn(): boolean {
  return Boolean(getServerDsn() || getBrowserDsn());
}

export async function captureException(error: unknown, context: CaptureContext = {}): Promise<void> {
  if (!hasEnabledDsn() || shouldIgnoreException(error)) {
    return;
  }

  const normalizedError = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');

  Sentry.withScope((scope) => {
    scope.setLevel(context.level ?? 'error');
    scope.setTags({
      service: 'web',
      runtime: typeof window === 'undefined' ? 'server' : 'browser',
      ...(context.tags ?? {}),
    });
    if (context.user?.id) {
      scope.setUser({ id: context.user.id });
    }
    if (context.extra) {
      scope.setExtras(sanitizeValue(context.extra) as Record<string, unknown>);
    }
    if (context.fingerprint && context.fingerprint.length > 0) {
      scope.setFingerprint(context.fingerprint);
    }
    Sentry.captureException(normalizedError);
  });
}
