import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Use explicit production URL as fallback
const BACKEND_URL = process.env.BACKEND_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || (process.env.NODE_ENV === 'production' ? 'https://localfarm-backend.vercel.app' : 'http://localhost:4000');

export async function GET(req: NextRequest) {
  // Use getToken instead of getServerSession to avoid Prisma dependency
  // Cast to any due to NextRequest type mismatch in monorepo
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/fields`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': token.id as string,
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
  // Use getToken instead of getServerSession to avoid Prisma dependency
  // Cast to any due to NextRequest type mismatch in monorepo
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Ensure polygon and location are properly serialized if they're objects
    const payload = {
      ...body,
      polygon: typeof body.polygon === 'object' ? JSON.stringify(body.polygon) : body.polygon,
      location: typeof body.location === 'object' ? JSON.stringify(body.location) : body.location,
    };

    const res = await fetch(`${BACKEND_URL}/api/v1/fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': token.id as string,
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
