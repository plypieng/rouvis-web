import { test, expect, type BrowserContext } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import fs from 'node:fs';
import path from 'node:path';

function resolveNextAuthSecret(): string {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;

  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return 'dev-secret';

  const envRaw = fs.readFileSync(envPath, 'utf8');
  const matched = envRaw.match(/^\s*NEXTAUTH_SECRET\s*=\s*(.+)\s*$/m);
  if (!matched?.[1]) return 'dev-secret';

  return matched[1].replace(/^['"]|['"]$/g, '').trim();
}

const SESSION_SECRET = resolveNextAuthSecret();
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002';

async function attachAuthenticatedSession(context: BrowserContext) {
  const token = await encode({
    secret: SESSION_SECRET,
    token: {
      sub: 'e2e-user-1',
      id: 'e2e-user-1',
      email: 'e2e@example.com',
      name: 'E2E User',
      onboardingComplete: true,
    },
    maxAge: 30 * 24 * 60 * 60,
  });

  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: token,
      url: BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

test.describe('P1 contextual UX regression', () => {
  test.beforeEach(async ({ context, page }) => {
    await attachAuthenticatedSession(context);

    await page.route('**/api/v1/telemetry/events', async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });
  });

  test('shows contextual AI CTA in empty projects state', async ({ page }) => {
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projects: [] }),
      });
    });

    await page.goto('/ja/projects');

    const aiLink = page.getByTestId('projects-empty-ai-link');
    await expect(aiLink).toBeVisible();
    await expect(aiLink).toHaveAttribute('href', /intent=project/);
    const href = await aiLink.getAttribute('href');
    expect(href || '').not.toContain('fresh=1');
  });

  test('reuses the latest thread for contextual chat entry by default', async ({ page }) => {
    let threads = [
      {
        id: 'base-thread',
        title: 'Existing Thread',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    let threadCounter = 1;
    let createThreadCalls = 0;

    await page.route('**/api/chatkit', async (route) => {
      const request = route.request();

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: [] }),
        });
        return;
      }

      const payload = request.postDataJSON() as { action?: string; payload?: { title?: string; projectId?: string } };
      if (payload.action === 'chatkit.list_threads') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ threads }),
        });
        return;
      }

      if (payload.action === 'chatkit.create_thread') {
        createThreadCalls += 1;
        const thread = {
          id: `ctx-thread-${threadCounter++}`,
          title: payload.payload?.title || 'Context Chat',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        threads = [thread, ...threads];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ thread }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    const contextUrl = `/ja/chat?intent=today&prompt=${encodeURIComponent('今日やるべき作業を優先順位つきで3つに整理して')}`;

    await page.goto(contextUrl);
    await expect(page.getByText('今日の優先3つ')).toBeVisible();

    const threadItems = page.getByTestId('chat-thread-item');
    await expect.poll(async () => threadItems.count()).toBe(1);
    expect(createThreadCalls).toBe(0);

    await page.goto(contextUrl);
    await expect(page.getByText('今日の優先3つ')).toBeVisible();

    await expect.poll(async () => threadItems.count()).toBe(1);
    expect(createThreadCalls).toBe(0);
  });

  test('creates a fresh thread for contextual chat entry when fresh=1 is explicit', async ({ page }) => {
    let threads = [
      {
        id: 'base-thread',
        title: 'Existing Thread',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    let threadCounter = 1;
    let createThreadCalls = 0;

    await page.route('**/api/chatkit', async (route) => {
      const request = route.request();

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: [] }),
        });
        return;
      }

      const payload = request.postDataJSON() as { action?: string; payload?: { title?: string; projectId?: string } };
      if (payload.action === 'chatkit.list_threads') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ threads }),
        });
        return;
      }

      if (payload.action === 'chatkit.create_thread') {
        createThreadCalls += 1;
        const thread = {
          id: `ctx-thread-${threadCounter++}`,
          title: payload.payload?.title || 'Context Chat',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        threads = [thread, ...threads];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ thread }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    const contextUrl = `/ja/chat?intent=today&prompt=${encodeURIComponent('今日やるべき作業を優先順位つきで3つに整理して')}&fresh=1`;

    await page.goto(contextUrl);
    await expect(page.getByText('今日の優先3つ')).toBeVisible();

    const threadItems = page.getByTestId('chat-thread-item');
    const firstVisitCount = await threadItems.count();

    await page.goto(contextUrl);
    await expect(page.getByText('今日の優先3つ')).toBeVisible();

    await expect.poll(async () => threadItems.count()).toBeGreaterThan(firstVisitCount);
    expect(createThreadCalls).toBe(2);
  });

  test('shows dashboard inference indicator while dashboard data streams', async ({ page }) => {
    await page.goto('/ja?debugDashboardDelayMs=1200', { waitUntil: 'commit' });

    const loader = page.getByTestId('dashboard-inference-loading');
    await expect(loader).toBeVisible();
    await expect(loader).toContainText('AIが今日の優先作業を推論しています');

    await expect(loader).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('today-command-center')).toBeVisible();
  });

  test('shows dashboard inline warning and tracks retry click', async ({ page }) => {
    await page.goto('/ja?debugDataError=1');

    const warning = page.getByTestId('dashboard-data-warning');
    await expect(warning).toBeVisible();

    const retryLink = page.getByTestId('dashboard-retry-link');
    await expect(retryLink).toBeVisible();
    await expect(retryLink).toHaveAttribute('href', /retry=/);

    const telemetryRequestPromise = page.waitForRequest((request) => {
      return request.url().includes('/api/v1/telemetry/events') && request.method() === 'POST';
    });

    await retryLink.click();
    const telemetryRequest = await telemetryRequestPromise;
    const rawPayload = telemetryRequest.postData() || telemetryRequest.postDataBuffer()?.toString('utf8') || '{}';
    const payload = JSON.parse(rawPayload) as { event?: string };

    expect(payload.event).toBe('dashboard_retry_clicked');
  });

  test('shows next-best-action recovery panel and tracks primary action', async ({ page }) => {
    await page.goto('/ja?debugDataError=1');

    const panel = page.getByTestId('dashboard-next-best-action');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('次の最善アクション');

    const primaryAction = page.getByTestId('dashboard-next-best-action-primary');
    await expect(primaryAction).toBeVisible();

    const telemetryRequestPromise = page.waitForRequest((request) => {
      if (!request.url().includes('/api/v1/telemetry/events')) return false;
      if (request.method() !== 'POST') return false;
      const rawPayload = request.postData() || request.postDataBuffer()?.toString('utf8') || '{}';
      return rawPayload.includes('dashboard_next_best_action_primary_clicked');
    });

    await primaryAction.click();
    const telemetryRequest = await telemetryRequestPromise;
    const rawPayload = telemetryRequest.postData() || telemetryRequest.postDataBuffer()?.toString('utf8') || '{}';
    const payload = JSON.parse(rawPayload) as { event?: string; properties?: { scenario?: string } };

    expect(payload.event).toBe('dashboard_next_best_action_primary_clicked');
    expect(payload.properties?.scenario).toBe('data_recovery');
  });
});
