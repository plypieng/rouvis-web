import { NextRequest } from 'next/server';
import { getBackendAuth } from '@/lib/backend-proxy-auth';

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_RETRIES = 1;

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const WEATHER_PROXY_TIMEOUT_MS = parsePositiveInt(process.env.WEATHER_PROXY_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
const WEATHER_PROXY_RETRIES = parseNonNegativeInt(process.env.WEATHER_PROXY_RETRIES, DEFAULT_RETRIES);

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

export function isWeatherTimeoutError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return error.name === 'TimeoutError' || error.name === 'AbortError';
}

export async function fetchWeatherUpstream(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= WEATHER_PROXY_RETRIES) {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(WEATHER_PROXY_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      if (!isWeatherTimeoutError(error) || attempt >= WEATHER_PROXY_RETRIES) {
        throw error;
      }
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Weather upstream request failed');
}
