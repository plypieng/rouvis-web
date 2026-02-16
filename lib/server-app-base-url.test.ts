import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const headersMock = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

import { getServerAppBaseUrl } from './server-app-base-url';

describe('getServerAppBaseUrl', () => {
  const originalEnv = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_URL;
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv.NEXT_PUBLIC_APP_URL;
    process.env.NEXTAUTH_URL = originalEnv.NEXTAUTH_URL;
    process.env.VERCEL_URL = originalEnv.VERCEL_URL;
    process.env.NODE_ENV = originalEnv.NODE_ENV;
  });

  it('prefers current request host over configured env host', async () => {
    process.env.NEXTAUTH_URL = 'https://configured.example.com';
    headersMock.mockResolvedValueOnce(new Headers({
      host: 'preview.example.vercel.app',
      'x-forwarded-proto': 'https',
    }));

    await expect(getServerAppBaseUrl()).resolves.toBe('https://preview.example.vercel.app');
  });

  it('sanitizes malformed env url values when request headers are unavailable', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://rouvis-prototype.vercel.app\\n';
    headersMock.mockResolvedValueOnce(new Headers());

    await expect(getServerAppBaseUrl()).resolves.toBe('https://rouvis-prototype.vercel.app');
  });

  it('falls back to localhost in non-production when no host info is available', async () => {
    headersMock.mockResolvedValueOnce(new Headers());
    process.env.NODE_ENV = 'development';

    await expect(getServerAppBaseUrl()).resolves.toBe('http://localhost:3000');
  });
});
