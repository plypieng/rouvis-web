import { NextRequest } from 'next/server';
import { getBackendAuth } from '../../../../../lib/backend-proxy-auth';
import {
  resolveBackendBaseUrl,
  resolveRequestId,
  toApiErrorResponse,
  toProxyJsonResponse,
} from '../../../../../lib/api-contract';

const BACKEND_URL = resolveBackendBaseUrl();

function extractId(request: NextRequest): string | null {
  return request.nextUrl.pathname.split('/').filter(Boolean).pop() || null;
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const projectId = extractId(req);
  if (!projectId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid project id',
      requestId,
    });
  }

  const auth = await getBackendAuth(req);
  if (!auth.headers) {
    return toApiErrorResponse({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId,
    });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/projects/${projectId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Project proxy GET error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch project',
      requestId,
    });
  }
}

async function proxyUpdate(req: NextRequest, method: 'PUT' | 'PATCH') {
  const requestId = resolveRequestId(req);
  const projectId = extractId(req);
  if (!projectId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid project id',
      requestId,
    });
  }

  const auth = await getBackendAuth(req);
  if (!auth.headers) {
    return toApiErrorResponse({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId,
    });
  }

  try {
    const body = await req.json();
    const idempotencyKey = req.headers.get('idempotency-key')
      || req.headers.get('x-idempotency-key');
    const res = await fetch(`${BACKEND_URL}/api/v1/projects/${projectId}`, {
      method,
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
    console.error(`Project proxy ${method} error:`, error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to update project',
      requestId,
    });
  }
}

export async function PUT(req: NextRequest) {
  return proxyUpdate(req, 'PUT');
}

export async function PATCH(req: NextRequest) {
  return proxyUpdate(req, 'PATCH');
}

export async function DELETE(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const projectId = extractId(req);
  if (!projectId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid project id',
      requestId,
    });
  }

  const auth = await getBackendAuth(req);
  if (!auth.headers) {
    return toApiErrorResponse({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId,
    });
  }

  try {
    const idempotencyKey = req.headers.get('idempotency-key')
      || req.headers.get('x-idempotency-key');
    const res = await fetch(`${BACKEND_URL}/api/v1/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        'X-Request-Id': requestId,
      },
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Project proxy DELETE error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete project',
      requestId,
    });
  }
}
