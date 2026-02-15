import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '../../../../../lib/backend-proxy-auth';

const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://localfarm-backend.vercel.app'
    : 'http://localhost:4000');

export async function GET(request: NextRequest) {
  const auth = await getBackendAuth(request);
  const params = new URLSearchParams(request.nextUrl.searchParams);

  // Personalization identity must come from auth context only.
  params.delete('userId');

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/knowledge/crops${params.toString() ? `?${params.toString()}` : ''}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(auth.headers || {}),
        },
      },
    );

    const payload = await response.json().catch(() => ({}));
    const proxied = NextResponse.json(payload, { status: response.status });
    const backendRequestId = response.headers.get('x-request-id');
    if (backendRequestId) {
      proxied.headers.set('X-Request-Id', backendRequestId);
    }
    return proxied;
  } catch (error) {
    console.error('Knowledge crops proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch crop knowledge' }, { status: 500 });
  }
}
