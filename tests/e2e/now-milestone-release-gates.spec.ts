import { test, expect, type APIRequestContext } from '@playwright/test';

const BACKEND_URL = process.env.PW_BACKEND_URL || 'http://localhost:4000';
const WEB_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002';

type RouteProbe = {
  name: string;
  method: 'GET' | 'POST';
  url: string;
  data?: Record<string, unknown>;
};

async function requestProbe(request: APIRequestContext, probe: RouteProbe) {
  if (probe.method === 'POST') {
    return request.post(probe.url, { data: probe.data ?? {} });
  }

  return request.get(probe.url);
}

function expectJsonResponse(response: { headers(): Record<string, string> }) {
  expect(response.headers()['content-type']).toMatch(/application\/json/i);
}

test.describe('Now milestone release gates', () => {
  test('backend protected endpoints reject unauthenticated access across core-loop and scheduler surfaces', async ({ request }) => {
    const probes: RouteProbe[] = [
      {
        name: 'financial analytics',
        method: 'GET',
        url: `${BACKEND_URL}/api/v1/analytics/financial`,
      },
      {
        name: 'yield analytics',
        method: 'GET',
        url: `${BACKEND_URL}/api/v1/analytics/yield`,
      },
      {
        name: 'schedule generation run status',
        method: 'GET',
        url: `${BACKEND_URL}/api/v1/agents/schedule-generation/runs/run-e2e`,
      },
      {
        name: 'schedule generation run events',
        method: 'GET',
        url: `${BACKEND_URL}/api/v1/agents/schedule-generation/runs/run-e2e/events`,
      },
      {
        name: 'schedule generation retry',
        method: 'POST',
        url: `${BACKEND_URL}/api/v1/agents/schedule-generation/runs/run-e2e/retry`,
      },
    ];

    for (const probe of probes) {
      const response = await requestProbe(request, probe);
      expect(response.status(), `${probe.name} should require authenticated workspace context`).toBe(401);
      expectJsonResponse(response);
    }
  });

  test('scheduler automation endpoint rejects invalid signed automation token', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/v1/agents/schedule-generation/tick-due`, {
      headers: {
        'x-scheduler-token': 'invalid-e2e-token',
      },
      data: {},
    });

    expect(response.status()).toBe(401);
    expectJsonResponse(response);
  });

  test('web BFF analytics proxies do not bypass backend auth', async ({ request }) => {
    const endpoints = [
      `${WEB_URL}/api/v1/analytics/financial`,
      `${WEB_URL}/api/v1/analytics/yield`,
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status(), `${endpoint} should reject missing NextAuth session`).toBe(401);
      expectJsonResponse(response);
    }
  });

  test('backend health remains available for release-gate diagnostics', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/v1/health`);
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({
      status: expect.any(String),
      time: expect.any(String),
    }));
  });
});
