import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '../../../../lib/backend-proxy-auth';

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
    const res = await fetch(`${BACKEND_URL}/api/v1/activities?${request.nextUrl.searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Activities proxy GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getBackendAuth(request);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/v1/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Activities proxy POST error:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
