import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

type AuthResult = { headers: { Authorization: string } } | { headers: null };

const SESSION_COOKIE_NAMES = [
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
  '__Secure-authjs.session-token',
  'authjs.session-token',
] as const;

function readSessionTokenFromCookies(request: NextRequest): string | null {
  for (const name of SESSION_COOKIE_NAMES) {
    const single = request.cookies.get(name)?.value;
    if (single) return single;

    const chunks = request.cookies
      .getAll()
      .map((cookie) => cookie.name)
      .filter((cookieName) => cookieName.startsWith(`${name}.`))
      .map((cookieName) => {
        const suffix = cookieName.slice(name.length + 1);
        return { cookieName, index: Number.parseInt(suffix, 10) };
      })
      .filter((entry) => Number.isFinite(entry.index))
      .sort((a, b) => a.index - b.index)
      .map((entry) => request.cookies.get(entry.cookieName)?.value ?? '')
      .filter(Boolean);

    if (chunks.length > 0) {
      return chunks.join('');
    }
  }

  return null;
}

export async function getBackendAuth(request: NextRequest): Promise<AuthResult> {
  const rawTokenFromNextAuth = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });
  const rawToken =
    (typeof rawTokenFromNextAuth === 'string' ? rawTokenFromNextAuth : null)
    ?? readSessionTokenFromCookies(request);

  if (!rawToken) {
    return { headers: null };
  }

  return {
    headers: { Authorization: `Bearer ${rawToken}` },
  };
}
