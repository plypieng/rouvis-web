import { NextRequest, NextResponse } from 'next/server';

import { getBackendAuth } from '../../../../../../../../lib/backend-proxy-auth';
import {
  resolveBackendBaseUrl,
  resolveRequestId,
  toApiErrorResponse,
  toProxyJsonResponse,
} from '../../../../../../../../lib/api-contract';

const BACKEND_URL = resolveBackendBaseUrl();

function extractRunId(request: NextRequest): string | null {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  const runsIndex = segments.lastIndexOf('runs');
  if (runsIndex === -1 || runsIndex + 1 >= segments.length) return null;
  return segments[runsIndex + 1] || null;
}

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const runId = extractRunId(request);

  if (!runId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid run id',
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
    const query = request.nextUrl.search || '';
    const upstream = await fetch(`${BACKEND_URL}/api/v1/agents/schedule-generation/runs/${runId}/stream${query}`, {
      method: 'GET',
      headers: {
        ...auth.headers,
        Accept: 'text/event-stream',
        'X-Request-Id': requestId,
      },
      cache: 'no-store',
    });

    const contentType = upstream.headers.get('content-type') || '';
    if (!upstream.ok || !contentType.toLowerCase().includes('text/event-stream') || !upstream.body) {
      return toProxyJsonResponse(upstream, requestId);
    }

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', upstream.headers.get('cache-control') || 'no-cache, no-transform');
    headers.set('Connection', 'keep-alive');
    headers.set('X-Request-Id', upstream.headers.get('x-request-id') || requestId);

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error('Schedule generation run stream proxy error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to proxy schedule generation stream',
      requestId,
    });
  }
}
