import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.PW_BACKEND_URL || 'http://localhost:4000';
const API_V1 = `${BACKEND_URL}/api/v1`;

test.describe('Backend API Security Contracts', () => {
  test('health endpoint is reachable', async ({ request }) => {
    const response = await request.get(`${API_V1}/health`);
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('time');
  });

  test('protected routes reject unauthenticated requests', async ({ request }) => {
    const protectedRoutes = [
      `${API_V1}/projects`,
      `${API_V1}/tasks`,
      `${API_V1}/activities`,
      `${API_V1}/fields`,
      `${API_V1}/threads`,
      `${API_V1}/analytics/financial`,
      `${API_V1}/analytics/yield`,
    ];

    for (const route of protectedRoutes) {
      const response = await request.get(route);
      expect(response.status(), `${route} should reject unauthenticated calls`).toBe(401);
    }
  });

  test('x-user-id header alone does not authenticate', async ({ request }) => {
    const response = await request.get(`${API_V1}/projects`, {
      headers: {
        'x-user-id': `spoofed-${Date.now()}`,
      },
    });

    expect(response.status()).toBe(401);
  });

  test('undo endpoint rejects unauthenticated mutation requests', async ({ request }) => {
    const response = await request.post(`${API_V1}/undo`, {
      data: {
        type: 'delete_task',
        taskId: 'fake-id',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('CORS preflight includes Authorization header and excludes x-user-id', async ({ request }) => {
    const response = await request.fetch(`${API_V1}/activities`, {
      method: 'OPTIONS',
    });

    expect(response.status()).toBe(200);
    const allowHeaders = response.headers()['access-control-allow-headers'] || '';
    expect(allowHeaders.toLowerCase()).toContain('authorization');
    expect(allowHeaders.toLowerCase()).not.toContain('x-user-id');
  });
});
