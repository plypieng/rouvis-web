import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getBackendAuthMock = vi.hoisted(() => vi.fn());
const getTokenMock = vi.hoisted(() => vi.fn());
const streamTextMock = vi.hoisted(() => vi.fn());
const openaiMock = vi.hoisted(() => vi.fn(() => 'mock-model'));

vi.mock('@/lib/backend-proxy-auth', () => ({
  getBackendAuth: getBackendAuthMock,
}));

vi.mock('next-auth/jwt', () => ({
  getToken: getTokenMock,
}));

vi.mock('ai', () => ({
  streamText: streamTextMock,
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: openaiMock,
}));

import { POST } from './route';

function makeRequest(requestId: string, body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
    },
    body: JSON.stringify(body),
  });
}

describe('/api/chat POST', () => {
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  const originalFreeLimit = process.env.AI_PROMPT_TOKEN_LIMIT_WEB_CHAT_FREE;
  const originalEntitlementMode = process.env.ENTITLEMENT_ENFORCEMENT_MODE;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = originalOpenAiKey;
    process.env.AI_PROMPT_TOKEN_LIMIT_WEB_CHAT_FREE = originalFreeLimit;
    process.env.ENTITLEMENT_ENFORCEMENT_MODE = originalEntitlementMode;

    getBackendAuthMock.mockResolvedValue({
      headers: {
        Authorization: 'Bearer token',
      },
    });
    getTokenMock.mockResolvedValue({ id: 'user-1', aiTier: 'free' });
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () => new Response('stream ok', { status: 200 }),
    });
  });

  it('returns 401 with standard envelope for unauthenticated callers', async () => {
    getBackendAuthMock.mockResolvedValueOnce({ headers: null });

    const response = await POST(makeRequest('req-auth-1', { messages: [] }));

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBe('req-auth-1');
    const payload = await response.json();
    expect(payload).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId: 'req-auth-1',
    });
  });

  it('returns 401 when token subject is missing', async () => {
    getTokenMock.mockResolvedValueOnce(null);

    const response = await POST(makeRequest('req-auth-2', { messages: [] }));

    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId: 'req-auth-2',
    });
  });

  it('returns 400 with standard envelope when messages is invalid', async () => {
    const response = await POST(makeRequest('req-validation-1', { bad: true }));

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'messages must be an array',
      requestId: 'req-validation-1',
    });
  });

  it('returns 429 with standard envelope when prompt budget is exceeded', async () => {
    process.env.AI_PROMPT_TOKEN_LIMIT_WEB_CHAT_FREE = '1';

    const response = await POST(makeRequest('req-rate-limit-1', {
      messages: [{ role: 'user', content: 'x'.repeat(100) }],
    }));

    expect(response.status).toBe(429);
    const payload = await response.json();
    expect(payload).toMatchObject({
      code: 'RATE_LIMITED',
      requestId: 'req-rate-limit-1',
    });
    expect(typeof payload.message).toBe('string');
  });

  it('returns 403 with entitlement envelope in enforce mode when chat entitlement is missing', async () => {
    process.env.ENTITLEMENT_ENFORCEMENT_MODE = 'enforce';
    getTokenMock.mockResolvedValueOnce({
      id: 'user-1',
      plan: 'free',
      entitlements: [],
    });

    const response = await POST(makeRequest('req-entitlement-1', {
      messages: [{ role: 'user', content: 'hello' }],
    }));

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload).toMatchObject({
      code: 'ENTITLEMENT_REQUIRED',
      requestId: 'req-entitlement-1',
    });
    expect(payload.details).toMatchObject({
      requiredEntitlement: 'ai.chat',
      currentPlan: 'FREE',
      mode: 'enforce',
    });
  });

  it('allows requests in report-only mode when chat entitlement is missing', async () => {
    process.env.ENTITLEMENT_ENFORCEMENT_MODE = 'report-only';
    delete process.env.OPENAI_API_KEY;
    getTokenMock.mockResolvedValueOnce({
      id: 'user-1',
      plan: 'free',
      entitlements: [],
    });

    const response = await POST(makeRequest('req-entitlement-2', {
      messages: [{ role: 'user', content: 'hello' }],
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-ai-fallback')).toBe('service_unavailable');
  });

  it('returns deterministic fallback text when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await POST(makeRequest('req-fallback-1', {
      messages: [{ role: 'user', content: 'hello' }],
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('req-fallback-1');
    expect(response.headers.get('x-ai-fallback')).toBe('service_unavailable');
    const text = await response.text();
    expect(text).toContain('現在AI応答が利用できない');
  });

  it('returns deterministic fallback text when provider call throws', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    streamTextMock.mockImplementationOnce(() => {
      throw new Error('provider down');
    });

    const response = await POST(makeRequest('req-fallback-2', {
      messages: [{ role: 'user', content: 'hello' }],
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('req-fallback-2');
    expect(response.headers.get('x-ai-fallback')).toBe('provider_unavailable');
    const text = await response.text();
    expect(text).toContain('現在AI応答が利用できない');
  });

  afterEach(() => {
    process.env.ENTITLEMENT_ENFORCEMENT_MODE = originalEntitlementMode;
  });
});
