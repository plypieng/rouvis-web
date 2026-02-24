import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getBackendAuth } from './backend-proxy-auth';

const getTokenMock = vi.hoisted(() => vi.fn());

vi.mock('next-auth/jwt', () => ({
  getToken: getTokenMock,
}));

describe('getBackendAuth', () => {
  beforeEach(() => {
    getTokenMock.mockReset();
  });

  it('uses next-auth raw token when available', async () => {
    getTokenMock.mockResolvedValueOnce('jwt-token');
    const request = new NextRequest('http://localhost:3000/api/v1/profile');

    const auth = await getBackendAuth(request);

    expect(auth).toEqual({
      headers: { Authorization: 'Bearer jwt-token' },
    });
  });

  it('falls back to direct session cookie when getToken returns null', async () => {
    getTokenMock.mockResolvedValueOnce(null);
    const request = new NextRequest('http://localhost:3000/api/v1/profile', {
      headers: {
        cookie: 'next-auth.session-token=cookie-token',
      },
    });

    const auth = await getBackendAuth(request);

    expect(auth).toEqual({
      headers: { Authorization: 'Bearer cookie-token' },
    });
  });

  it('reconstructs chunked session cookie values', async () => {
    getTokenMock.mockResolvedValueOnce(null);
    const request = new NextRequest('http://localhost:3000/api/v1/profile', {
      headers: {
        cookie: 'next-auth.session-token.0=part1; next-auth.session-token.1=part2',
      },
    });

    const auth = await getBackendAuth(request);

    expect(auth).toEqual({
      headers: { Authorization: 'Bearer part1part2' },
    });
  });

  it('returns null headers when no token exists', async () => {
    getTokenMock.mockResolvedValueOnce(null);
    const request = new NextRequest('http://localhost:3000/api/v1/profile');

    const auth = await getBackendAuth(request);

    expect(auth).toEqual({ headers: null });
  });
});
