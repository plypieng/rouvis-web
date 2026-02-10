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
];

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

interface CaptureContext {
  tags?: Record<string, string>;
  extra?: Record<string, JsonValue>;
  user?: {
    id?: string;
  };
  level?: 'error' | 'warning' | 'info';
}

function shouldSample(): boolean {
  const sampleRateRaw = process.env.NEXT_PUBLIC_SENTRY_ERROR_SAMPLE_RATE ?? process.env.SENTRY_ERROR_SAMPLE_RATE ?? '1';
  const sampleRate = Number(sampleRateRaw);
  if (Number.isNaN(sampleRate)) return true;
  if (sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;
  return Math.random() <= sampleRate;
}

function maskString(value: string): string {
  if (value.length <= 6) return '[REDACTED]';
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function sanitizeValue(value: unknown, keyHint = ''): JsonValue {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    return SENSITIVE_KEYS.some((sensitiveKey) => keyHint.toLowerCase().includes(sensitiveKey))
      ? maskString(value)
      : value;
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
      const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey));
      sanitized[key] = isSensitive ? '[REDACTED]' : sanitizeValue(entry, key);
    }
    return sanitized;
  }

  return String(value);
}

function parseDsn(dsn: string): { storeUrl: string; publicKey: string } | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (!publicKey || pathParts.length === 0) return null;

    const projectId = pathParts[pathParts.length - 1];
    const pathPrefix = pathParts.slice(0, -1).join('/');
    const prefix = pathPrefix ? `/${pathPrefix}` : '';
    const storeUrl = `${url.protocol}//${url.host}${prefix}/api/${projectId}/store/`;
    return { storeUrl, publicKey };
  } catch {
    return null;
  }
}

function createStacktrace(error: Error): JsonValue {
  if (!error.stack) return [];
  const frames = error.stack
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ function: line }));
  return frames;
}

export async function captureException(error: unknown, context: CaptureContext = {}): Promise<void> {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || !shouldSample()) {
    return;
  }

  const parsed = parseDsn(dsn);
  if (!parsed) {
    return;
  }

  const normalizedError = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
  const level = context.level ?? 'error';

  const payload = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tags: {
      service: 'web',
      runtime: typeof window === 'undefined' ? 'server' : 'browser',
      ...(context.tags ?? {}),
    },
    user: context.user,
    extra: sanitizeValue(context.extra ?? {}),
    exception: {
      values: [
        {
          type: normalizedError.name,
          value: normalizedError.message,
          stacktrace: {
            frames: createStacktrace(normalizedError),
          },
        },
      ],
    },
  };

  const auth = `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=rouvis-custom/1.0`;

  await fetch(parsed.storeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': auth,
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}
