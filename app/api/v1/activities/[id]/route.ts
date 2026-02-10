import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuth } from '../../../../../lib/backend-proxy-auth';

const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://localfarm-backend.vercel.app'
    : 'http://localhost:4000');

export async function DELETE(request: NextRequest) {
  const activityId = request.nextUrl.pathname.split('/').filter(Boolean).pop();

  if (!activityId) {
    return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 });
  }

  const auth = await getBackendAuth(request);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/undo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
      body: JSON.stringify({ type: 'delete_activity', activityId }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Activities proxy DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
  }
}
