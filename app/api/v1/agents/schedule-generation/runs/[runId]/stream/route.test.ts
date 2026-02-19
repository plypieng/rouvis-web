import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getBackendAuthMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../../../../../lib/backend-proxy-auth', () => ({
  getBackendAuth: getBackendAuthMock,
}));

import { GET } from './route';

function makeRequest(requestId: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/agents/schedule-generation/runs/run-1/stream?after=10', {
    method: 'GET',
    headers: {
      accept: 'text/event-stream',
      'x-request-id': requestId,
    },
  });
}

describe('/api/v1/agents/schedule-generation/runs/[runId]/stream BFF route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards SSE stream responses without JSON rewrapping', async () => {
    getBackendAuthMock.mockResolvedValueOnce({
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        'id: 11\ndata: {"cursor":"11","type":"stage"}\n\n',
        {
          status: 200,
          headers: {
            'content-type': 'text/event-stream; charset=utf-8',
            'cache-control': 'no-cache, no-transform',
            'x-request-id': 'backend-stream-1',
          },
        },
      ),
    );

    const response = await GET(makeRequest('req-stream-1'));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('x-request-id')).toBe('backend-stream-1');
    expect(text).toContain('id: 11');
    expect(text).toContain('"cursor":"11"');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/agents/schedule-generation/runs/run-1/stream?after=10'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-Request-Id': 'req-stream-1',
          Accept: 'text/event-stream',
        }),
      }),
    );

    fetchMock.mockRestore();
  });

  it('falls back to JSON proxy when upstream is not SSE', async () => {
    getBackendAuthMock.mockResolvedValueOnce({
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ code: 'NOT_FOUND' }),
        {
          status: 404,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    const response = await GET(makeRequest('req-stream-2'));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      code: 'NOT_FOUND',
    });

    fetchMock.mockRestore();
  });
});
