import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getBackendAuthMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../../lib/backend-proxy-auth', () => ({
  getBackendAuth: getBackendAuthMock,
}));

import { POST } from './route';

function makeRequest(requestId: string, body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/agents/generate-schedule', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
    },
    body: JSON.stringify(body),
  });
}

describe('/api/v1/agents/generate-schedule BFF route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 envelope when unauthenticated', async () => {
    getBackendAuthMock.mockResolvedValueOnce({ headers: null });

    const response = await POST(makeRequest('req-generate-unauth-1', {
      projectId: 'project-1',
    }));

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBe('req-generate-unauth-1');
    expect(await response.json()).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId: 'req-generate-unauth-1',
    });
  });

  it('proxies accepted async response (202) from backend', async () => {
    getBackendAuthMock.mockResolvedValueOnce({
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          generation: {
            mode: 'async',
            runId: 'run-1',
            engine: 'legacy_llm',
            state: 'queued',
          },
        }),
        {
          status: 202,
          headers: {
            'content-type': 'application/json',
            'x-request-id': 'backend-generate-1',
          },
        },
      ),
    );

    const response = await POST(makeRequest('req-generate-async-1', {
      projectId: 'project-1',
      source: 'wizard_initial',
      cropAnalysis: {
        crop: 'Tomato',
        startDate: '2026-03-01',
        targetHarvestDate: '2026-06-01',
      },
      currentDate: '2026-02-19',
    }));

    expect(response.status).toBe(202);
    expect(response.headers.get('x-request-id')).toBe('backend-generate-1');
    expect(await response.json()).toMatchObject({
      generation: {
        mode: 'async',
        runId: 'run-1',
        engine: 'legacy_llm',
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/agents/generate-schedule'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Request-Id': 'req-generate-async-1',
        }),
      }),
    );

    fetchMock.mockRestore();
  });

  it('returns 500 when upstream request fails', async () => {
    getBackendAuthMock.mockResolvedValueOnce({
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network down'));

    const response = await POST(makeRequest('req-generate-timeout-1', {
      projectId: 'project-1',
      source: 'wizard_initial',
      cropAnalysis: {
        crop: 'Tomato',
        startDate: '2026-03-01',
        targetHarvestDate: '2026-06-01',
      },
      currentDate: '2026-02-19',
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate schedule',
      requestId: 'req-generate-timeout-1',
    });

    fetchMock.mockRestore();
  });
});
