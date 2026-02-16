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
  const fieldId = request.nextUrl.pathname.split('/').filter(Boolean).pop();
  if (!fieldId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid field id',
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
    const res = await fetch(`${BACKEND_URL}/api/v1/fields/${fieldId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Fields proxy GET by id error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch field',
      requestId,
    });
  }
}

export async function PUT(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const fieldId = request.nextUrl.pathname.split('/').filter(Boolean).pop();
  if (!fieldId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid field id',
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
    const body = await request.json();
    const payload = normalizeFieldPayload(body);

    const res = await fetch(`${BACKEND_URL}/api/v1/fields/${fieldId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
      body: JSON.stringify(payload),
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Fields proxy PUT error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to update field',
      requestId,
    });
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const fieldId = request.nextUrl.pathname.split('/').filter(Boolean).pop();
  if (!fieldId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid field id',
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
    const body = await request.json();
    const payload = normalizeFieldPayload(body);

    const res = await fetch(`${BACKEND_URL}/api/v1/fields/${fieldId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
      body: JSON.stringify(payload),
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Fields proxy PATCH error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to update field',
      requestId,
    });
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const fieldId = request.nextUrl.pathname.split('/').filter(Boolean).pop();
  if (!fieldId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid field id',
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
    const res = await fetch(`${BACKEND_URL}/api/v1/fields/${fieldId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Fields proxy DELETE error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete field',
      requestId,
    });
  }
}

function normalizeFieldPayload(body: unknown) {
  const record = (body && typeof body === 'object') ? (body as Record<string, unknown>) : {};
  return { ...record };
}
