import { NextRequest } from 'next/server';
import { getBackendAuth } from '../../../../lib/backend-proxy-auth';
import {
  resolveBackendBaseUrl,
  resolveRequestId,
  toApiErrorResponse,
  toProxyJsonResponse,
} from '../../../../lib/api-contract';

const BACKEND_URL = resolveBackendBaseUrl();

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
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
    const res = await fetch(`${BACKEND_URL}/api/v1/fields`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Fields proxy GET error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch fields',
      requestId,
    });
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
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

    const payload = {
      ...body,
      // Pass objects directly to backend - let body parser and Prisma handle serialization
    };

    const res = await fetch(`${BACKEND_URL}/api/v1/fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
      body: JSON.stringify(payload),
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Fields proxy POST error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to create field',
      requestId,
    });
  }
}
