import { headers } from 'next/headers';

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function normalizeHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(',')[0]?.trim();
  return first || null;
}

function normalizeConfiguredBaseUrl(value: string | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim().replace(/\\n/g, '');
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    return trimTrailingSlash(parsed.toString());
  } catch {
    return null;
  }
}

export async function getServerAppBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = normalizeHeaderValue(headerStore.get('x-forwarded-host'))
    || normalizeHeaderValue(headerStore.get('host'));
  if (host) {
    const proto = normalizeHeaderValue(headerStore.get('x-forwarded-proto'))
      || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${proto}://${host}`;
  }

  const configured = normalizeConfiguredBaseUrl(process.env.NEXT_PUBLIC_APP_URL)
    || normalizeConfiguredBaseUrl(process.env.NEXTAUTH_URL);
  if (configured) {
    return configured;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return process.env.NODE_ENV === 'production'
    ? 'https://localhost'
    : 'http://localhost:3000';
}
