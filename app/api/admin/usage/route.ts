import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'INTERNAL_API_KEY not set on web server' }, { status: 500 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'demo-user';
    const since = url.searchParams.get('since') || new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const upstream = await fetch(`${apiBase}/api/v1/usage?since=${encodeURIComponent(since)}`, {
      headers: {
        'x-api-key': apiKey,
        'x-user-id': userId,
      },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json({ error: `Upstream error ${upstream.status}`, details: text }, { status: upstream.status });
    }
    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Admin usage proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}

