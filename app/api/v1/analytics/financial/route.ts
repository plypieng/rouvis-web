import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '../../../../../lib/backend-proxy-auth';

const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://localfarm-backend.vercel.app'
    : 'http://localhost:4000');

export async function GET(request: NextRequest) {
  const auth = await getBackendAuth(request);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/analytics/financial`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Analytics financial proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch financial analytics' }, { status: 500 });
  }
}
