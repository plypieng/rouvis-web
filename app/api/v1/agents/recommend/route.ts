import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '../../../../../lib/backend-proxy-auth';

const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://localfarm-backend.vercel.app'
    : 'http://localhost:4000');

export async function POST(request: NextRequest) {
  const auth = await getBackendAuth(request);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const requestId = request.headers.get('x-request-id');
    const response = await fetch(`${BACKEND_URL}/api/v1/agents/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
        ...(requestId ? { 'X-Request-Id': requestId } : {}),
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    const proxied = NextResponse.json(payload, { status: response.status });
    const backendRequestId = response.headers.get('x-request-id');
    if (backendRequestId) {
      proxied.headers.set('X-Request-Id', backendRequestId);
    }
    return proxied;
  } catch (error) {
    console.error('Agents recommend proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendation' }, { status: 500 });
  }
}
