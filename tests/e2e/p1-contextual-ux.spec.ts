import { test, expect, type BrowserContext } from '@playwright/test';
import { encode } from 'next-auth/jwt';

const SESSION_SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret';
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
    await expect(aiLink).toHaveAttribute('href', /fresh=1/);
  });

  test('creates a fresh thread for contextual chat entry', async ({ page }) => {
    let threads = [
      {
        id: 'base-thread',
        title: 'Existing Thread',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    let threadCounter = 1;

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

      const payload = request.postDataJSON() as { action?: string; payload?: { title?: string } };
      if (payload.action === 'chatkit.list_threads') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ threads }),
        });
        return;
      }

      if (payload.action === 'chatkit.create_thread') {
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

    const threadTitles = page.locator('div.text-sm.font-medium.mb-1', { hasText: 'Today Focus' });
    const firstVisitCount = await threadTitles.count();

    await page.goto(contextUrl);
    await expect(page.getByText('今日の優先3つ')).toBeVisible();

    await expect.poll(async () => threadTitles.count()).toBeGreaterThan(firstVisitCount);
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
});
