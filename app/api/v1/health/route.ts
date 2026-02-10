import { NextResponse } from 'next/server';

import { captureException } from '@/lib/sentry';

const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://localfarm-backend.vercel.app'
    : 'http://localhost:4000');

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/health`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Health proxy error:', error);
    await captureException(error, {
      tags: { source: 'api.v1.health.proxy' },
    });
    return NextResponse.json({ status: 'error', error: 'Failed to reach backend' }, { status: 502 });
  }
}
