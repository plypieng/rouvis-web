import { NextResponse } from 'next/server';
import { GOOGLE_AUTH_SCOPE } from '@/lib/auth-contract';

function normalizeEnvValue(value?: string): string {
  return (value ?? '').replace(/\\[rn]/g, '').trim();
}

function maskClientId(clientId?: string): string | null {
  if (!clientId) return null;
  if (clientId.length <= 16) return `${clientId.slice(0, 4)}...${clientId.slice(-4)}`;
  return `${clientId.slice(0, 12)}...${clientId.slice(-12)}`;
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const googleClientId = normalizeEnvValue(process.env.GOOGLE_CLIENT_ID);
  const nextAuthUrl = normalizeEnvValue(process.env.NEXTAUTH_URL);

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? null,
    host: process.env.HOST ?? null,
    oauth: {
      scope: GOOGLE_AUTH_SCOPE,
      clientIdMasked: maskClientId(googleClientId),
      clientIdPrefix: googleClientId ? googleClientId.split('.apps.googleusercontent.com')[0] : null,
    },
    nextAuthUrl: nextAuthUrl || null,
  });
}
