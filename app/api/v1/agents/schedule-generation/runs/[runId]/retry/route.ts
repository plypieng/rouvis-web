import { NextRequest } from 'next/server';

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

export async function POST(request: NextRequest) {
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
    const res = await fetch(`${BACKEND_URL}/api/v1/agents/schedule-generation/runs/${runId}/retry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
      body: '{}',
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Schedule generation run retry proxy error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to retry schedule generation run',
      requestId,
    });
  }
}
