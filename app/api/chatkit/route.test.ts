import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getBackendAuthMock = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/backend-proxy-auth', () => ({
  getBackendAuth: getBackendAuthMock,
}));

import { POST } from './route';

function makeRequest(requestId: string, body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/chatkit', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
    },
    body: JSON.stringify(body),
  });
}

describe('/api/chatkit POST', () => {
  const originalBackendUrl = process.env.BACKEND_URL;
  const originalPublicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BACKEND_URL = 'http://backend.local';
    process.env.NEXT_PUBLIC_API_BASE_URL = '';
    getBackendAuthMock.mockResolvedValue({
      headers: {
        Authorization: 'Bearer token',
      },
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    process.env.BACKEND_URL = originalBackendUrl;
    process.env.NEXT_PUBLIC_API_BASE_URL = originalPublicApiBaseUrl;
    vi.unstubAllGlobals();
  });

  it('returns 401 with standard error envelope when auth is missing', async () => {
    getBackendAuthMock.mockResolvedValueOnce({ headers: null });

    const response = await POST(makeRequest('req-chatkit-auth-1', { messages: [] }));

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBe('req-chatkit-auth-1');
    const payload = await response.json();
    expect(payload).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId: 'req-chatkit-auth-1',
      error: 'Unauthorized',
      errorCode: 'UNAUTHORIZED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 400 with standard envelope for update_thread missing threadId', async () => {
    const response = await POST(makeRequest('req-chatkit-validation-1', {
      action: 'chatkit.update_thread',
      payload: { title: 'x' },
    }));

    expect(response.status).toBe(400);
    expect(response.headers.get('x-request-id')).toBe('req-chatkit-validation-1');
    const payload = await response.json();
    expect(payload).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'threadId is required',
      requestId: 'req-chatkit-validation-1',
      errorCode: 'VALIDATION_ERROR',
    });
  });

  it('forwards chatkit.list_threads project scope with projectId query', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      threads: [{ id: 'thread-proj-1' }],
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'upstream-threads-1',
      },
    }));

    const response = await POST(makeRequest('req-chatkit-threads-1', {
      action: 'chatkit.list_threads',
      payload: { projectId: 'project-123' },
    }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend.local/api/v1/threads?projectId=project-123',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('upstream-threads-1');
    const payload = await response.json();
    expect(payload).toMatchObject({
      threads: [{ id: 'thread-proj-1' }],
    });
  });

  it('forwards chatkit.list_threads without payload to global list endpoint', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      threads: [{ id: 'thread-global-1' }],
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'upstream-threads-2',
      },
    }));

    const response = await POST(makeRequest('req-chatkit-threads-2', {
      action: 'chatkit.list_threads',
    }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend.local/api/v1/threads',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('upstream-threads-2');
    const payload = await response.json();
    expect(payload).toMatchObject({
      threads: [{ id: 'thread-global-1' }],
    });
  });

  it('maps upstream structured errors into chatkit standard envelope', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      code: 'VALIDATION_ERROR',
      message: 'invalid messages payload',
      requestId: 'upstream-req-1',
    }), {
      status: 400,
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'upstream-req-1',
      },
    }));

    const response = await POST(makeRequest('req-chatkit-upstream-1', {
      messages: [{ role: 'user', content: 'hello' }],
    }));

    expect(response.status).toBe(400);
    expect(response.headers.get('x-request-id')).toBe('upstream-req-1');
    const payload = await response.json();
    expect(payload).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'invalid messages payload',
      requestId: 'upstream-req-1',
      error: 'invalid messages payload',
      errorCode: 'VALIDATION_ERROR',
    });
  });

  it('propagates intent_policy events through transformed chat stream', async () => {
    const ssePayload = `data: {"type":"content","delta":{"content":"Hi"}}\n\n`
      + `data: {"type":"intent_policy","data":{"responsePolicy":"casual","primaryIntent":"greeting","confidence":0.98,"clarificationRequired":false}}\n\n`;
    fetchMock.mockResolvedValueOnce(new Response(ssePayload, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'x-request-id': 'upstream-req-stream-1',
      },
    }));

    const response = await POST(makeRequest('req-chatkit-stream-1', {
      messages: [{ role: 'user', content: 'hello' }],
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('upstream-req-stream-1');
    const body = await response.text();
    expect(body).toContain('0:"Hi"');
    expect(body).toContain('e:{"type":"intent_policy","data":{"responsePolicy":"casual","primaryIntent":"greeting","confidence":0.98,"clarificationRequired":false}}');
  });

  it('propagates reasoning_trace events through transformed chat stream', async () => {
    const reasoningEvent = {
      type: 'reasoning_trace',
      stepId: 'rt_1',
      phase: 'tooling',
      status: 'update',
      title: 'Tool: scheduler.plan',
      sourceEvent: 'tool_call_delta',
      timestamp: '2026-02-18T07:00:00.000Z',
    };
    const ssePayload = `data: ${JSON.stringify(reasoningEvent)}\n\n`;
    fetchMock.mockResolvedValueOnce(new Response(ssePayload, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'x-request-id': 'upstream-req-stream-2',
      },
    }));

    const response = await POST(makeRequest('req-chatkit-stream-2', {
      messages: [{ role: 'user', content: 'show trace' }],
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('upstream-req-stream-2');
    const body = await response.text();
    expect(body).toContain(`e:${JSON.stringify(reasoningEvent)}`);
  });
});
