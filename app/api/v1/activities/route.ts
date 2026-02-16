import { NextRequest } from 'next/server';
import { getBackendAuth } from '../../../../lib/backend-proxy-auth';
import {
  resolveBackendBaseUrl,
  resolveRequestId,
  toApiErrorResponse,
  toProxyJsonResponse,
} from '../../../../lib/api-contract';

const BACKEND_URL = resolveBackendBaseUrl();

export async function GET(request: NextRequest) {
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

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/activities?${request.nextUrl.searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Activities proxy GET error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch activities',
      requestId,
    });
  }
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

  try {
    const body = await request.json();
    const idempotencyKey = request.headers.get('idempotency-key')
      || request.headers.get('x-idempotency-key');
    const res = await fetch(`${BACKEND_URL}/api/v1/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        'X-Request-Id': requestId,
      },
      body: JSON.stringify(body),
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Activities proxy POST error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to create activity',
      requestId,
    });
  }
}
