import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '../../../../../lib/backend-proxy-auth';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production' ? 'https://localfarm-backend.vercel.app' : 'http://localhost:4000');

export async function GET(request: NextRequest) {
  const auth = await getBackendAuth(request);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/account/data-requests`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
      cache: 'no-store',
    });

    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });
    const requestId = res.headers.get('x-request-id');
    if (requestId) {
      response.headers.set('X-Request-Id', requestId);
    }
    return response;
  } catch (error) {
    console.error('Account data requests proxy GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch account data requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getBackendAuth(request);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const idempotencyKey = request.headers.get('idempotency-key')
      || request.headers.get('x-idempotency-key');
    const requestId = request.headers.get('x-request-id');

    const res = await fetch(`${BACKEND_URL}/api/v1/account/data-requests`, {
      method: 'POST',
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
    console.error('Account data requests proxy POST error:', error);
    return NextResponse.json({ error: 'Failed to submit account data request' }, { status: 500 });
  }
}
