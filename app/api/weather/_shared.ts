import { NextRequest } from 'next/server';
import { getBackendAuth } from '@/lib/backend-proxy-auth';

export function getWeatherBackendUrl(): string {
  return process.env.BACKEND_URL
    || process.env.NEXT_PUBLIC_API_BASE_URL
    || (process.env.NODE_ENV === 'production'
      ? 'https://localfarm-backend.vercel.app'
      : 'http://localhost:4000');
}

export async function getWeatherProxyHeaders(request: NextRequest): Promise<Record<string, string>> {
  const auth = await getBackendAuth(request);

  return {
    'Content-Type': 'application/json',
    ...(auth.headers || {}),
  };
}

export function appendQueryParam(params: URLSearchParams, key: string, value: string | null): void {
  if (!value) return;
  params.set(key, value);
}
