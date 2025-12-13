'server-only';

import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import type { Session } from 'next-auth';

export async function getServerSessionFromToken(): Promise<Session | null> {
  const cookieStore = await cookies();

  // Get the session token cookie directly
  const sessionToken = cookieStore.get('next-auth.session-token')?.value
    || cookieStore.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) {
    console.log('[getServerSessionFromToken] No session token cookie found');
    return null;
  }

  try {
    // Decode the JWT directly
    const token = await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    console.log('[getServerSessionFromToken] Decoded token:', token ? 'Token found with sub: ' + token.sub : 'Decode failed');

    if (!token) return null;

    const userId = (token.id as string) ?? token.sub ?? null;
    if (!userId) return null;

    return {
      user: {
        id: userId,
        email: (token.email as string) ?? '',
        name: (token.name as string) ?? '',
        image: (token.picture as string) ?? undefined,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    } as Session;
  } catch (error) {
    console.error('[getServerSessionFromToken] Error decoding token:', error);
    return null;
  }
}
