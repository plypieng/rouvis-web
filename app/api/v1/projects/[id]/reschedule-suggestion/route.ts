import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '../../../../../../lib/backend-proxy-auth';

const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://localfarm-backend.vercel.app'
    : 'http://localhost:4000');

function extractProjectId(request: NextRequest): string | null {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  const projectsIndex = segments.lastIndexOf('projects');
  if (projectsIndex === -1 || projectsIndex + 1 >= segments.length) {
    return null;
  }
  return segments[projectsIndex + 1] || null;
}

export async function GET(request: NextRequest) {
  const projectId = extractProjectId(request);
  if (!projectId) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }

  const auth = await getBackendAuth(request);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/projects/${projectId}/reschedule-suggestion`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Project reschedule suggestion proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch reschedule suggestion' }, { status: 500 });
  }
}
