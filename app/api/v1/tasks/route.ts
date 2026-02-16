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

  const params = new URLSearchParams(request.nextUrl.searchParams);
  if (params.has('field_id') && !params.has('fieldId')) {
    params.set('fieldId', params.get('field_id') || '');
    params.delete('field_id');
  }
  if (params.has('start_date') && !params.has('startDate')) {
    params.set('startDate', params.get('start_date') || '');
    params.delete('start_date');
  }
  if (params.has('end_date') && !params.has('endDate')) {
    params.set('endDate', params.get('end_date') || '');
    params.delete('end_date');
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/tasks?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Tasks proxy GET error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch tasks',
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
    const res = await fetch(`${BACKEND_URL}/api/v1/tasks`, {
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
    console.error('Tasks proxy POST error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to create task',
      requestId,
    });
  }
}
