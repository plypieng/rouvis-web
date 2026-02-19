import { NextRequest } from 'next/server';
import { getBackendAuth } from '../../../../../../../lib/backend-proxy-auth';
import {
  resolveBackendBaseUrl,
  resolveRequestId,
  toApiErrorResponse,
  toProxyJsonResponse,
} from '../../../../../../../lib/api-contract';

const BACKEND_URL = resolveBackendBaseUrl();

function extractRouteIds(request: NextRequest): { projectId: string; revisionId: string } | null {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  const projectsIndex = segments.lastIndexOf('projects');
  const revisionsIndex = segments.lastIndexOf('schedule-revisions');

  if (
    projectsIndex === -1
    || revisionsIndex === -1
    || projectsIndex + 1 >= segments.length
    || revisionsIndex + 1 >= segments.length
  ) {
    return null;
  }

  const projectId = segments[projectsIndex + 1] || '';
  const revisionId = segments[revisionsIndex + 1] || '';

  if (!projectId || !revisionId) return null;
  return { projectId, revisionId };
}

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const ids = extractRouteIds(request);

  if (!ids) {
    return toApiErrorResponse({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid route parameters',
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
    const res = await fetch(`${BACKEND_URL}/api/v1/projects/${ids.projectId}/schedule-revisions/${ids.revisionId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        'X-Request-Id': requestId,
      },
    });

    return toProxyJsonResponse(res, requestId);
  } catch (error) {
    console.error('Project schedule revision detail proxy GET error:', error);
    return toApiErrorResponse({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch schedule revision detail',
      requestId,
    });
  }
}
