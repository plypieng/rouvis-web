import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const userId = (token?.id as string | undefined) ?? token?.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/undo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
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
