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

  const params = new URLSearchParams(request.nextUrl.searchParams);
  if (params.has('field_id') && !params.has('fieldId')) {
    params.set('fieldId', params.get('field_id') || '');
    params.delete('field_id');
  }
  if (params.has('start_date') && !params.has('startDate')) {
    params.set('startDate', params.get('start_date') || '');
    params.delete('start_date');
  }
  if (params.has('end_date') && !params.has('endDate')) {
    params.set('endDate', params.get('end_date') || '');
    params.delete('end_date');
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/tasks?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Tasks proxy GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getBackendAuth(request);
  if (!auth.headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/v1/tasks`, {
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
    console.error('Tasks proxy POST error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
