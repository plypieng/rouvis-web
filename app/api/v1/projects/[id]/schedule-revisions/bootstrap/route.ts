import { NextRequest } from 'next/server';
import { getBackendAuth } from '../../../../../../../lib/backend-proxy-auth';
import {
  resolveBackendBaseUrl,
  resolveRequestId,
  toApiErrorResponse,
  toProxyJsonResponse,
} from '../../../../../../../lib/api-contract';

const BACKEND_URL = resolveBackendBaseUrl();

function extractProjectId(request: NextRequest): string | null {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  const projectsIndex = segments.lastIndexOf('projects');
  if (projectsIndex === -1 || projectsIndex + 1 >= segments.length) {
    return null;
  }
  return segments[projectsIndex + 1] || null;
}

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const projectId = extractProjectId(request);

  if (!projectId) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid project id',
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
    const res = await fetch(`${BACKEND_URL}/api/v1/projects/${projectId}/schedule-revisions/bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Project schedule revision bootstrap proxy POST error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to bootstrap schedule revision baseline',
      requestId,
    });
  }
}
