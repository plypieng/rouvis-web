import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import {
  resolveRequestId,
  toApiErrorResponse,
  toProxyJsonResponse,
} from './api-contract';

describe('api-contract helpers', () => {
  it('reuses a valid incoming request id header', () => {
    const request = new NextRequest('http://localhost:3000/api/v1/test', {
      headers: {
        'x-request-id': 'req-valid-123',
      },
    });

    expect(resolveRequestId(request)).toBe('req-valid-123');
  });

  it('generates a request id when incoming value is invalid', () => {
    const request = new NextRequest('http://localhost:3000/api/v1/test', {
      headers: {
        'x-request-id': '***',
      },
    });

    const generated = resolveRequestId(request);
    expect(generated).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(generated.length).toBeGreaterThan(8);
  });

  it('returns standardized error envelope with request id header', async () => {
    const response = toApiErrorResponse({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId: 'req-auth-1',
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBe('req-auth-1');
    const payload = await response.json();
    expect(payload).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId: 'req-auth-1',
      error: 'Unauthorized',
      errorCode: 'UNAUTHORIZED',
    });
  });

  it('propagates backend request id on successful proxy responses', async () => {
    const backendResponse = new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'backend-req-1',
        },
      }
    );
    const proxied = await toProxyJsonResponse(backendResponse, 'fallback-req-1');

    expect(proxied.status).toBe(200);
    expect(proxied.headers.get('x-request-id')).toBe('backend-req-1');
    const payload = await proxied.json();
    expect(payload).toEqual({ ok: true });
  });
});
