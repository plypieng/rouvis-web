'server-only';

import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import type { Session } from 'next-auth';

export async function getServerSessionFromToken(token?: string) {
  let sessionToken = token;
  if (!sessionToken) {
    const cookieStore = await cookies();
    sessionToken =
      cookieStore.get('__Secure-next-auth.session-token')?.value
      ?? cookieStore.get('next-auth.session-token')?.value
      ?? cookieStore.get('__Secure-authjs.session-token')?.value
      ?? cookieStore.get('authjs.session-token')?.value;
  }

  if (!sessionToken) {
    return null;
  }

  try {
    // Decode the token (it's a JWE/JWT from NextAuth)
    // Note: We need the NEXTAUTH_SECRET to decode it
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return null;

    // Use NextAuth's decode function
    const decoded = await decode({
      token: sessionToken,
      secret,
    });

    if (!decoded || !decoded.email) {
      return null;
    }

    // Convert to session object
    return {
      user: {
        name: decoded.name,
        email: decoded.email,
        image: decoded.picture,
        id: decoded.sub || '',
      },
      expires: decoded.exp ? new Date((decoded.exp as number) * 1000).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.error('[getServerSessionFromToken] Error decoding token:', error);
    return null;
  }
}
