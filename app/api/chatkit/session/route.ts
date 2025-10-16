import { CHATKIT_API_BASE, WORKFLOW_ID } from '@/lib/chatkit';

export const runtime = 'edge';

interface CreateSessionRequestBody {
  workflow?: { id?: string | null } | null;
  workflowId?: string | null;
  scope?: { user_id?: string | null } | null;
  chatkit_configuration?: {
    file_upload?: {
      enabled?: boolean;
    };
  };
}

const DEFAULT_CHATKIT_BASE = 'https://api.openai.com';
const SESSION_COOKIE_NAME = 'chatkit_session_id';
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return methodNotAllowed();
  }

  let sessionCookie: string | null = null;

  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return jsonResponse(
        { error: 'Missing OPENAI_API_KEY environment variable' },
        500
      );
    }

    const body = await safeParseJson<CreateSessionRequestBody>(request);
    const { userId, cookie: resolvedCookie } = resolveUserId(request);
    sessionCookie = resolvedCookie;

    const resolvedWorkflowId =
      body?.workflow?.id ?? body?.workflowId ?? WORKFLOW_ID;
    if (!resolvedWorkflowId) {
      return jsonResponse(
        { error: 'Missing NEXT_PUBLIC_CHATKIT_WORKFLOW_ID configuration' },
        400,
        sessionCookie
      );
    }

    const apiBase = CHATKIT_API_BASE || DEFAULT_CHATKIT_BASE;
    const upstream = await fetch(`${apiBase}/v1/chatkit/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'chatkit_beta=v1',
      },
      body: JSON.stringify({
        workflow: { id: resolvedWorkflowId },
        user: userId,
        chatkit_configuration: {
          file_upload: {
            enabled:
              body?.chatkit_configuration?.file_upload?.enabled ?? false,
          },
        },
      }),
    });

    const raw = await upstream.text();
    const json = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

    if (!upstream.ok) {
      const detail = extractUpstreamError(json) ?? upstream.statusText;
      console.error('ChatKit session creation failed', {
        status: upstream.status,
        detail,
        body: json,
      });
      return jsonResponse(
        { error: detail, details: json },
        upstream.status,
        sessionCookie
      );
    }

    const clientSecret = json?.client_secret;
    const expiresAfter = json?.expires_after;

    if (!clientSecret || typeof clientSecret !== 'string') {
      return jsonResponse(
        { error: 'Missing client secret in ChatKit response' },
        502,
        sessionCookie
      );
    }

    return jsonResponse(
      {
        client_secret: clientSecret,
        expires_after: expiresAfter ?? null,
      },
      200,
      sessionCookie
    );
  } catch (error) {
    console.error('Create ChatKit session error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create session';
    return jsonResponse({ error: message }, 500, sessionCookie);
  }
}

function methodNotAllowed(): Response {
  return new Response(null, {
    status: 405,
    headers: {
      Allow: 'POST',
    },
  });
}

function resolveUserId(request: Request): {
  userId: string;
  cookie: string | null;
} {
  const existing = getCookieValue(request.headers.get('cookie'));
  if (existing) {
    return { userId: existing, cookie: null };
  }

  const generated =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return {
    userId: generated,
    cookie: serializeCookie(generated),
  };
}

function getCookieValue(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const entries = cookieHeader.split(';');
  for (const entry of entries) {
    const [rawName, ...rest] = entry.split('=');
    if (!rawName || rest.length === 0) continue;
    if (rawName.trim() === SESSION_COOKIE_NAME) {
      return decodeURIComponent(rest.join('=').trim());
    }
  }
  return null;
}

function serializeCookie(value: string): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${SESSION_COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function jsonResponse(
  payload: unknown,
  status: number,
  sessionCookie: string | null
): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (sessionCookie) {
    headers.append('Set-Cookie', sessionCookie);
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}

async function safeParseJson<T>(request: Request): Promise<T | null> {
  try {
    const text = await request.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function extractUpstreamError(
  payload: Record<string, unknown> | undefined
): string | null {
  if (!payload) {
    return null;
  }

  const error = payload.error;
  if (typeof error === 'string') {
    return error;
  }
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  const details = payload.details;
  if (typeof details === 'string') {
    return details;
  }
  if (details && typeof details === 'object' && 'error' in details) {
    const nested = (details as { error?: unknown }).error;
    if (typeof nested === 'string') {
      return nested;
    }
    if (
      nested &&
      typeof nested === 'object' &&
      'message' in nested &&
      typeof (nested as { message?: unknown }).message === 'string'
    ) {
      return (nested as { message: string }).message;
    }
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  return null;
}
