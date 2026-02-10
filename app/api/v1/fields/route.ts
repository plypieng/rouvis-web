import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '../../../../lib/backend-proxy-auth';

// Use explicit production URL as fallback
const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production' ? 'https://localfarm-backend.vercel.app' : 'http://localhost:4000');

export async function GET(req: NextRequest) {
  const auth = await getBackendAuth(req);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/fields`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Fields proxy GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch fields' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getBackendAuth(req);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const payload = {
      ...body,
      // Pass objects directly to backend - let body parser and Prisma handle serialization
    };

    const res = await fetch(`${BACKEND_URL}/api/v1/fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Fields proxy POST error:', error);
    return NextResponse.json({ error: 'Failed to create field' }, { status: 500 });
  }
}
