import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

export type BffApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'ENTITLEMENT_REQUIRED'
  | 'INTERNAL_ERROR';

interface ApiErrorResponseOptions {
  status: number;
  code: BffApiErrorCode;
  message: string;
  requestId: string;
  details?: unknown;
}

const REQUEST_ID_HEADER = 'x-request-id';
const MAX_REQUEST_ID_LENGTH = 128;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export function resolveRequestId(request: NextRequest): string {
  const raw = request.headers.get(REQUEST_ID_HEADER) || '';
  const candidate = raw.trim();
  if (
    candidate &&
    candidate.length <= MAX_REQUEST_ID_LENGTH &&
    REQUEST_ID_PATTERN.test(candidate)
  ) {
    return candidate;
  }
  return randomUUID();
}

export function toApiErrorResponse(options: ApiErrorResponseOptions): NextResponse {
  const payload: Record<string, unknown> = {
    code: options.code,
    message: options.message,
    requestId: options.requestId,
    // Backward-compatible fields for legacy clients.
    error: options.message,
    errorCode: options.code,
  };
  if (options.details !== undefined) {
    payload.details = options.details;
  }

  return NextResponse.json(payload, {
    status: options.status,
    headers: {
      'X-Request-Id': options.requestId,
    },
  });
}

async function readProxyPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    return response.json().catch(() => ({}));
  }

  const text = await response.text().catch(() => '');
  if (!text) return {};
  return { message: text };
}

export async function toProxyJsonResponse(
  response: Response,
  fallbackRequestId: string
): Promise<NextResponse> {
  const payload = await readProxyPayload(response);
  const proxied = NextResponse.json(payload, {
    status: response.status,
  });
  const backendRequestId = response.headers.get('x-request-id');
  proxied.headers.set('X-Request-Id', backendRequestId || fallbackRequestId);
  return proxied;
}

export function resolveBackendBaseUrl(): string {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://localfarm-backend.vercel.app'
      : 'http://localhost:4000')
  );
}
