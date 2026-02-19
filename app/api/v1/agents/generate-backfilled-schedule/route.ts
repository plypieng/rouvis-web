import { NextRequest } from 'next/server';

import { getBackendAuth } from '../../../../../lib/backend-proxy-auth';
import {
  resolveBackendBaseUrl,
  resolveRequestId,
  toApiErrorResponse,
  toProxyJsonResponse,
} from '../../../../../lib/api-contract';

const BACKEND_URL = resolveBackendBaseUrl();

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

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/agents/generate-backfilled-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
      body: JSON.stringify(body),
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Agents generate-backfilled-schedule proxy error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate backfilled schedule',
      requestId,
    });
  }
}
