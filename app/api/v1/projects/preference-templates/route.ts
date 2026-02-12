import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '../../../../../lib/backend-proxy-auth';

const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://localfarm-backend.vercel.app'
    : 'http://localhost:4000');

export async function GET(req: NextRequest) {
  const auth = await getBackendAuth(req);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/projects/preference-templates`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Project preference templates proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch preference templates' }, { status: 500 });
  }
}
