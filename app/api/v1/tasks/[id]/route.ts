import { NextRequest } from 'next/server';
import { getBackendAuth } from '../../../../../lib/backend-proxy-auth';
import {
  resolveBackendBaseUrl,
  resolveRequestId,
  toApiErrorResponse,
  toProxyJsonResponse,
} from '../../../../../lib/api-contract';

const BACKEND_URL = resolveBackendBaseUrl();

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const taskId = extractId(request);
  if (!taskId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid task id',
      requestId,
    });
  }

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
    const res = await fetch(`${BACKEND_URL}/api/v1/tasks/${taskId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Tasks proxy GET by id error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch task',
      requestId,
    });
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const taskId = extractId(request);
  if (!taskId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid task id',
      requestId,
    });
  }
  return updateTask(request, taskId, requestId);
}

export async function PUT(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const taskId = extractId(request);
  if (!taskId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid task id',
      requestId,
    });
  }
  return updateTask(request, taskId, requestId);
}

export async function DELETE(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const taskId = extractId(request);
  if (!taskId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid task id',
      requestId,
    });
  }

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
    const idempotencyKey = request.headers.get('idempotency-key')
      || request.headers.get('x-idempotency-key');
    const res = await fetch(`${BACKEND_URL}/api/v1/undo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        'X-Request-Id': requestId,
      },
      body: JSON.stringify({ type: 'delete_task', taskId }),
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Tasks proxy DELETE error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete task',
      requestId,
    });
  }
}

async function updateTask(request: NextRequest, taskId: string, requestId: string) {
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
    const res = await fetch(`${BACKEND_URL}/api/v1/tasks/${taskId}`, {
      method: request.method,
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
    console.error('Tasks proxy update error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to update task',
      requestId,
    });
  }
}

function extractId(request: NextRequest): string | null {
  return request.nextUrl.pathname.split('/').filter(Boolean).pop() || null;
}
