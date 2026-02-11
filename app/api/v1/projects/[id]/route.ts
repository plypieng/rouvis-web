import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '../../../../../lib/backend-proxy-auth';

const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://localfarm-backend.vercel.app'
    : 'http://localhost:4000');

function extractId(request: NextRequest): string | null {
  return request.nextUrl.pathname.split('/').filter(Boolean).pop() || null;
}

export async function GET(req: NextRequest) {
  const projectId = extractId(req);
  if (!projectId) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }

  const auth = await getBackendAuth(req);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/projects/${projectId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
    });

    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });
    const requestId = res.headers.get('x-request-id');
    if (requestId) {
      response.headers.set('X-Request-Id', requestId);
    }
    return response;
  } catch (error) {
    console.error('Project proxy GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const projectId = extractId(req);
  if (!projectId) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }

  const auth = await getBackendAuth(req);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const idempotencyKey = req.headers.get('idempotency-key')
      || req.headers.get('x-idempotency-key');
    const requestId = req.headers.get('x-request-id');
    const res = await fetch(`${BACKEND_URL}/api/v1/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...(requestId ? { 'X-Request-Id': requestId } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });
    const backendRequestId = res.headers.get('x-request-id');
    if (backendRequestId) {
      response.headers.set('X-Request-Id', backendRequestId);
    }
    return response;
  } catch (error) {
    console.error('Project proxy PUT error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const projectId = extractId(req);
  if (!projectId) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }

  const auth = await getBackendAuth(req);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const idempotencyKey = req.headers.get('idempotency-key')
      || req.headers.get('x-idempotency-key');
    const requestId = req.headers.get('x-request-id');
    const res = await fetch(`${BACKEND_URL}/api/v1/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...(requestId ? { 'X-Request-Id': requestId } : {}),
      },
    });

    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });
    const backendRequestId = res.headers.get('x-request-id');
    if (backendRequestId) {
      response.headers.set('X-Request-Id', backendRequestId);
    }
    return response;
  } catch (error) {
    console.error('Project proxy DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
