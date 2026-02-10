import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

type AuthResult = { headers: { Authorization: string } } | { headers: null };

export async function getBackendAuth(request: NextRequest): Promise<AuthResult> {
  const rawToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });

  if (!rawToken) {
    return { headers: null };
  }

  return {
    headers: { Authorization: `Bearer ${rawToken}` },
  };
}
