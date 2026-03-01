import { expect, type BrowserContext, type Locator, type Page, type TestInfo } from '@playwright/test';
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

export type ChatThread = {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
};

type ChatRequestBody = {
  action?: string;
  payload?: { title?: string; projectId?: string };
};

export type ProjectListItem = {
  id: string;
  name: string;
  crop?: string | null;
  variety?: string | null;
  startDate?: string | null;
  status?: string | null;
};

export function isMobileProject(testInfo: TestInfo): boolean {
  return /mobile/i.test(testInfo.project.name);
}

export function isDesktopProject(testInfo: TestInfo): boolean {
  return !isMobileProject(testInfo);
}

export async function attachAuthenticatedSession(
  context: BrowserContext,
  uiMode: 'new_farmer' | 'veteran_farmer' = 'new_farmer',
) {
  const token = await encode({
    secret: SESSION_SECRET,
    token: {
      sub: 'e2e-user-1',
      id: 'e2e-user-1',
      email: 'e2e@example.com',
      name: 'E2E User',
      onboardingComplete: true,
      profileComplete: true,
      uiMode,
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

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDailyForecastRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const safeStart = Number.isFinite(start.getTime()) ? start : new Date('2026-02-01T00:00:00.000Z');
  const safeEnd = Number.isFinite(end.getTime()) ? end : new Date(safeStart.getTime());

  const days: Array<Record<string, unknown>> = [];
  const cursor = new Date(safeStart.getTime());
  while (cursor <= safeEnd) {
    const date = toDateOnly(cursor);
    days.push({
      date,
      temperature: { min: 12, max: 24 },
      condition: { code: 1, label: 'Sunny', icon: '01d' },
      precipitationMm: 0,
      precipProbability: 10,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

export async function setupCommonClientRoutes(page: Page) {
  await page.route('**/api/v1/telemetry/events', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/api/weather/forecast/daily**', async (route) => {
    const url = new URL(route.request().url());
    const startDate = url.searchParams.get('startDate') || '2026-02-01';
    const endDate = url.searchParams.get('endDate') || startDate;
    const daily = buildDailyForecastRange(startDate, endDate);

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

export async function setupChatkitRoutes(
  page: Page,
  options?: { threads?: ChatThread[] },
) {
  let threads = [...(options?.threads || [
    {
      id: 'thread-mobile-1',
      title: 'Morning field check',
      createdAt: '2026-03-01T07:00:00.000Z',
      updatedAt: '2026-03-01T07:15:00.000Z',
    },
    {
      id: 'thread-mobile-2',
      title: 'Weather follow-up',
      createdAt: '2026-03-01T08:00:00.000Z',
      updatedAt: '2026-03-01T08:20:00.000Z',
    },
  ])];
  let createdCount = 0;

  await page.route('**/api/chatkit**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'GET') {
      if (url.searchParams.get('intent_metrics') === '1') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totals: { detected: 12, clarificationPrompted: 1, recovered: 1, misrouteFeedback: 0 },
            rates: { misrouteRate: 0.01, clarificationRate: 0.08, recoveryRate: 0.92 },
            policyLatency: { workflow: { p95LatencyMs: 480 } },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: [] }),
      });
      return;
    }

    let body: ChatRequestBody = {};
    try {
      body = JSON.parse(request.postData() || '{}') as ChatRequestBody;
    } catch {
      body = {};
    }

    if (body.action === 'chatkit.list_threads') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ threads }),
      });
      return;
    }

    if (body.action === 'chatkit.create_thread') {
      createdCount += 1;
      const thread = {
        id: `thread-mobile-new-${createdCount}`,
        title: body.payload?.title || 'New Conversation',
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

    if (body.action === 'chatkit.undo') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
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

export async function setupProjectDetailRoutes(page: Page) {
  await setupChatkitRoutes(page, {
    threads: [
      {
        id: 'thread-project-1',
        title: 'Project cockpit thread',
        createdAt: '2026-03-01T06:00:00.000Z',
        updatedAt: '2026-03-01T06:45:00.000Z',
      },
    ],
  });

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
}

export async function setupProjectsListRoutes(
  page: Page,
  options?: { projects?: ProjectListItem[] },
) {
  const projects = options?.projects || [
    {
      id: 'project-1',
      name: 'North Field Tomatoes',
      crop: 'Tomato',
      variety: 'Roma',
      startDate: '2026-02-01',
      status: 'active',
    },
    {
      id: 'project-2',
      name: 'Herb Tunnel Reset',
      crop: 'Basil',
      variety: 'Genovese',
      startDate: '2026-01-15',
      status: 'archived',
    },
  ];

  await page.route('**/api/v1/projects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects }),
    });
  });
}

export async function readScrollMetrics(locator: Locator) {
  return locator.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }));
}

export async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
}

export async function expectClassContains(locator: Locator, classToken: string) {
  await expect.poll(async () => await locator.getAttribute('class')).toContain(classToken);
}
