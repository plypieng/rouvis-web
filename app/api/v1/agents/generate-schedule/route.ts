import { NextRequest } from 'next/server';

import { getBackendAuth } from '../../../../../lib/backend-proxy-auth';
import {
  resolveBackendBaseUrl,
  resolveRequestId,
  toApiErrorResponse,
  toProxyJsonResponse,
} from '../../../../../lib/api-contract';

const BACKEND_URL = resolveBackendBaseUrl();
const DEFAULT_TIMEOUT_MS = 15_000;

function resolveTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.SCHEDULE_GENERATION_BFF_TIMEOUT_MS || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return parsed;
}

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const auth = await getBackendAuth(request);
  if (!auth.headers) {
    return toApiErrorResponse({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid JSON payload',
      requestId,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, resolveTimeoutMs());

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/agents/generate-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') {
      return toApiErrorResponse({
        status: 504,
        code: 'INTERNAL_ERROR',
        message: 'Schedule generation upstream timeout',
        requestId,
      });
    }

    console.error('Agents generate-schedule proxy error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate schedule',
      requestId,
    });
  } finally {
    clearTimeout(timeout);
  }
}
