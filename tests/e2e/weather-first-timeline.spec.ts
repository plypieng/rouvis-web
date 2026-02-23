import { test, expect, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
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
  const userId = process.env.PLAYWRIGHT_AUTH_USER_ID || 'e2e-user-1';
  const token = await encode({
    secret: SESSION_SECRET,
    token: {
      sub: userId,
      id: userId,
      email: process.env.PLAYWRIGHT_AUTH_EMAIL || 'e2e@example.com',
      name: process.env.PLAYWRIGHT_AUTH_NAME || 'E2E User',
      onboardingComplete: true,
      profileComplete: true,
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

function isMobileProject(testInfo: TestInfo): boolean {
  return /mobile/i.test(testInfo.project.name);
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDailyForecastRange(startDate: string, endDate: string, rainyDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const safeStart = Number.isFinite(start.getTime()) ? start : new Date('2026-02-01T00:00:00.000Z');
  const safeEnd = Number.isFinite(end.getTime()) ? end : new Date(safeStart.getTime());

  const days: Array<Record<string, unknown>> = [];
  const cursor = new Date(safeStart.getTime());
  while (cursor <= safeEnd) {
    const date = toDateOnly(cursor);
    const rainy = date === rainyDate;
    days.push({
      date,
      temperature: {
        min: rainy ? 11 : 13,
        max: rainy ? 18 : 24,
      },
      condition: rainy
        ? { code: 61, label: 'Rain', icon: '10d' }
        : { code: 1, label: 'Sunny', icon: '01d' },
      precipitationMm: rainy ? 12 : 0,
      precipProbability: rainy ? 85 : 15,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

async function setupWeatherRoutes(page: Page, forcedRainyDate?: string) {
  await page.route('**/api/weather/forecast/daily**', async (route) => {
    const url = new URL(route.request().url());
    const startDate = url.searchParams.get('startDate') || '2026-02-01';
    const endDate = url.searchParams.get('endDate') || startDate;
    const rainyDate = forcedRainyDate || startDate;
    const daily = buildDailyForecastRange(startDate, endDate, rainyDate);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        location: { lat: 37.4, lon: 138.9, label: 'Nagaoka', reason: 'project_field_coordinates' },
        daily,
        meta: {
          fetchedAt: new Date().toISOString(),
          validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          isStale: false,
          provider: 'mock-weather',
          providerModel: 'test',
          locationReason: 'project_field_coordinates',
        },
      }),
    });
  });
}

async function setupCommonClientRoutes(page: Page) {
  await page.route('**/api/v1/telemetry/events', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/api/chatkit**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: [] }),
      });
      return;
    }

    const body = request.postDataJSON() as { action?: string };
    if (body.action === 'chatkit.list_threads') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          threads: [{ id: 'thread-1', title: 'E2E thread', updatedAt: new Date().toISOString() }],
        }),
      });
      return;
    }

    if (body.action === 'chatkit.create_thread') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ thread: { id: 'thread-1' } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

async function dragTaskToDate(page: Page, taskTitle: string, targetDate: string) {
  const source = page.locator('[data-testid="calendar-date"] [data-testid="scheduled-item"]').filter({ hasText: taskTitle }).first();
  const target = page.locator(`[data-testid="calendar-date"][data-date="${targetDate}"]`).first();

  await expect(source).toBeVisible();
  await expect(target).toBeVisible();

  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error('Unable to resolve drag coordinates');
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2 + 20,
    sourceBox.y + sourceBox.height / 2 + 16,
    { steps: 8 },
  );
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 16 },
  );
  await page.mouse.up();
}

async function ensureProjectCalendarVisible(page: Page, testInfo: TestInfo) {
  if (!isMobileProject(testInfo)) return;
  const tab = page.getByTestId('project-mobile-tab-calendar');
  if (await tab.count()) {
    await tab.click();
  }
}

test.describe('Weather-first timeline', () => {
  test.beforeEach(async ({ context }) => {
    await attachAuthenticatedSession(context);
  });

  test('applies rainy-day weather metadata in standalone calendar', async ({ page }) => {
    await setupCommonClientRoutes(page);
    await setupWeatherRoutes(page, '2026-02-16');

    await page.goto('/ja/calendar?date=2026-02-14&debugMockCalendar=seeded');

    const rainyDay = page.locator('[data-testid="calendar-date"][data-date="2026-02-16"]');
    await expect(rainyDay).toBeVisible();
    await expect(rainyDay).toHaveAttribute('data-weather-risk', 'rainy');
    await expect(rainyDay).toHaveAttribute('data-weather-precip', '85');
    await expect(rainyDay.locator('[data-testid="calendar-weather-icon"]')).toBeVisible();
  });

  test('requires explicit force-confirmation when dropping weather-sensitive task on rainy day', async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo), 'Desktop pointer drag scenario only.');

    await setupCommonClientRoutes(page);
    await setupWeatherRoutes(page, '2026-02-16');

    const patchCalls: Array<Record<string, unknown>> = [];
    await page.route('**/api/v1/tasks/**', async (route) => {
      const request = route.request();
      if (request.method() !== 'PATCH') {
        await route.continue();
        return;
      }

      const bodyRaw = request.postData() || '{}';
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(bodyRaw) as Record<string, unknown>;
      } catch {
        body = {};
      }
      patchCalls.push(body);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ task: { id: 'task-debug-spray' } }),
      });
    });

    await page.goto('/ja/calendar?date=2026-02-14&debugMockCalendar=seeded');

    await dragTaskToDate(page, 'Fungicide', '2026-02-16');

    const warningDialog = page.getByTestId('weather-drop-warning-dialog');
    await expect(warningDialog).toBeVisible();
    await expect(page.getByTestId('weather-drop-warning-message')).toContainText('85%');
    expect(patchCalls.length).toBe(0);

    await page.getByTestId('weather-drop-warning-cancel').click();
    await expect(warningDialog).toBeHidden();
    expect(patchCalls.length).toBe(0);

    await dragTaskToDate(page, 'Fungicide', '2026-02-16');
    await expect(warningDialog).toBeVisible();
    await page.getByTestId('weather-drop-warning-confirm').click();

    await expect.poll(() => patchCalls.length).toBe(1);
    const movedDueAt = String(patchCalls[0]?.dueAt || '');
    expect(movedDueAt).toContain('2026-02-16');
  });

  test('renders weather risk metadata in project month grid', async ({ page }, testInfo) => {
    await setupCommonClientRoutes(page);
    await setupWeatherRoutes(page);

    await page.route('**/api/v1/projects/project-1/reschedule-suggestion', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggestion: null,
          signals: {
            weatherRiskCount: 0,
            staleWeather: false,
          },
        }),
      });
    });

    await page.route('**/api/weather/overview**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          location: { label: 'Nagaoka' },
          current: {
            temperature: 20,
            temperatureRange: { min: 12, max: 24 },
            condition: { code: 1, label: 'Sunny', icon: '01d' },
            windSpeedKmh: 8,
            windDirectionLabel: 'E',
            precipitationMm: 0,
            observedAt: new Date().toISOString(),
          },
          daily: [],
          alerts: [],
          schedulingRisks: [],
        }),
      });
    });

    await page.goto('/ja/projects/project-1?debugMockProject=seeded');
    await ensureProjectCalendarVisible(page, testInfo);

    const rainyProjectCell = page.locator('[data-testid="project-calendar-day"][data-weather-risk="rainy"]').first();
    await expect(rainyProjectCell).toBeVisible();
    await expect(rainyProjectCell.locator('[data-testid="project-calendar-weather-icon"]')).toBeVisible();
  });
});
