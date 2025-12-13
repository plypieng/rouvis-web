import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://localfarm-backend.vercel.app'
    : 'http://localhost:4000');

export async function GET(request: NextRequest) {
  const fieldId = request.nextUrl.pathname.split('/').filter(Boolean).pop();
  if (!fieldId) {
    return NextResponse.json({ error: 'Invalid field id' }, { status: 400 });
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const userId = (token?.id as string | undefined) ?? token?.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/fields/${fieldId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Fields proxy GET by id error:', error);
    return NextResponse.json({ error: 'Failed to fetch field' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const fieldId = request.nextUrl.pathname.split('/').filter(Boolean).pop();
  if (!fieldId) {
    return NextResponse.json({ error: 'Invalid field id' }, { status: 400 });
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const userId = (token?.id as string | undefined) ?? token?.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = normalizeFieldPayload(body);

    const res = await fetch(`${BACKEND_URL}/api/v1/fields/${fieldId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Fields proxy PUT error:', error);
    return NextResponse.json({ error: 'Failed to update field' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const fieldId = request.nextUrl.pathname.split('/').filter(Boolean).pop();
  if (!fieldId) {
    return NextResponse.json({ error: 'Invalid field id' }, { status: 400 });
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const userId = (token?.id as string | undefined) ?? token?.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = normalizeFieldPayload(body);

    const res = await fetch(`${BACKEND_URL}/api/v1/fields/${fieldId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Fields proxy PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update field' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const fieldId = request.nextUrl.pathname.split('/').filter(Boolean).pop();
  if (!fieldId) {
    return NextResponse.json({ error: 'Invalid field id' }, { status: 400 });
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const userId = (token?.id as string | undefined) ?? token?.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/fields/${fieldId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Fields proxy DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete field' }, { status: 500 });
  }
}

function normalizeFieldPayload(body: unknown) {
  const record = (body && typeof body === 'object') ? (body as Record<string, unknown>) : {};
  const polygon = record.polygon;
  const location = record.location;

  return {
    ...record,
    polygon: polygon && typeof polygon === 'object' ? JSON.stringify(polygon) : polygon,
    location: location && typeof location === 'object' ? JSON.stringify(location) : location,
  };
}
