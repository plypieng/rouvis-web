import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getBackendAuthMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../lib/backend-proxy-auth', () => ({
  getBackendAuth: getBackendAuthMock,
}));

import { GET } from './route';

function makeRequest(requestId: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/projects', {
    method: 'GET',
    headers: {
      'x-request-id': requestId,
    },
  });
}

describe('/api/v1/projects route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns standardized envelope when unauthenticated', async () => {
    getBackendAuthMock.mockResolvedValueOnce({ headers: null });

    const response = await GET(makeRequest('req-projects-auth-1'));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBe('req-projects-auth-1');
    expect(payload).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId: 'req-projects-auth-1',
    });
  });

  it('forwards backend request id on successful proxy response', async () => {
    getBackendAuthMock.mockResolvedValueOnce({
      headers: {
        Authorization: 'Bearer token',
      },
    });

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ projects: [] }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-request-id': 'backend-projects-1',
          },
        })
      );

    const response = await GET(makeRequest('req-projects-proxy-1'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('backend-projects-1');
    expect(payload).toEqual({ projects: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/projects'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Request-Id': 'req-projects-proxy-1',
        }),
      })
    );
    fetchMock.mockRestore();
  });
});
