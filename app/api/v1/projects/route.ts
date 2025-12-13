import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Use explicit production URL as fallback
const BACKEND_URL = process.env.BACKEND_URL
    || process.env.NEXT_PUBLIC_API_BASE_URL
    || (process.env.NODE_ENV === 'production' ? 'https://localfarm-backend.vercel.app' : 'http://localhost:4000');

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    const userId = (token?.id as string | undefined) ?? token?.sub;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/projects`, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Projects proxy GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    const userId = (token?.id as string | undefined) ?? token?.sub;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();

        const res = await fetch(`${BACKEND_URL}/api/v1/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Projects proxy POST error:', error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}
