import { test, expect, type BrowserContext, type Page } from '@playwright/test';
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
  const userId = process.env.PLAYWRIGHT_AUTH_USER_ID || 'e2e-user-vertical-1';
  const token = await encode({
    secret: SESSION_SECRET,
    token: {
      sub: userId,
      id: userId,
      email: process.env.PLAYWRIGHT_AUTH_EMAIL || 'e2e@example.com',
      name: process.env.PLAYWRIGHT_AUTH_NAME || 'E2E User',
      profileComplete: true,
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

function makeProject(tasks: Array<{ id: string; title: string; dueDate: string; status: 'pending' | 'completed' }>) {
  return {
    id: 'project-1',
    name: 'Planner Test',
    crop: 'Tomato',
    variety: 'Momotaro',
    startDate: '2026-02-10',
    targetHarvestDate: '2026-06-10',
    status: 'active',
    notes: 'Vertical planner e2e',
    primaryFieldId: 'field-1',
    fieldIds: ['field-1'],
    tasks,
    schedulingPreferences: { maxTasksPerDay: 4 },
  };
}

async function mockProjectDetailShell(page: Page) {
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

async function mockProjectDetailRoutes(page: Page, params: {
  runId: string;
  project: ReturnType<typeof makeProject>;
  runStatusResolver: (calls: number) => {
    state: 'queued' | 'running' | 'succeeded' | 'failed';
    engine: 'legacy_llm' | 'vertical_planner_v1';
    plannerVersion: string | null;
    rulesetVersion: string | null;
    optimizerUsed: boolean | null;
  };
  events: Array<Record<string, unknown>>;
}) {
  let runStatusCalls = 0;

  await mockProjectDetailShell(page);

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === '/api/v1/projects/project-1' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ project: params.project }),
      });
      return;
    }

    if (pathname === '/api/v1/projects/project-1/reschedule-suggestion' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggestion: null,
          signals: { weatherRiskCount: 0, staleWeather: false },
        }),
      });
      return;
    }

    if (pathname === '/api/v1/projects/project-1/schedule-revisions/bootstrap' && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ created: false, revision: null }),
      });
      return;
    }

    if (pathname === '/api/v1/projects/project-1/schedule-revisions' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          revisions: [],
          page: { hasMore: false, nextCursor: null },
        }),
      });
      return;
    }

    if (pathname === `/api/v1/agents/schedule-generation/runs/${params.runId}` && method === 'GET') {
      runStatusCalls += 1;
      const next = params.runStatusResolver(runStatusCalls);
      if (next.state === 'succeeded' && params.project.tasks.length === 0) {
        params.project.tasks = [
          {
            id: 'task-prod-1',
            title: 'Production ruleset task',
            dueDate: '2026-02-25T06:00:00.000Z',
            status: 'pending',
          },
        ];
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: params.runId,
          projectId: 'project-1',
          source: 'wizard_initial',
          replanMode: 'replace_all',
          state: next.state,
          engine: next.engine,
          plannerVersion: next.plannerVersion,
          rulesetVersion: next.rulesetVersion,
          optimizerUsed: next.optimizerUsed,
          attemptsUsed: 1,
          maxAttempts: 2,
          retryable: next.state !== 'succeeded',
          commitRevisionId: next.state === 'succeeded' ? 'rev-1' : null,
          errorCode: null,
          errorMessage: null,
          createdAt: '2026-02-19T00:00:00.000Z',
          startedAt: '2026-02-19T00:00:01.000Z',
          completedAt: next.state === 'succeeded' ? '2026-02-19T00:00:03.000Z' : null,
        }),
      });
      return;
    }

    if (pathname === `/api/v1/agents/schedule-generation/runs/${params.runId}/events` && method === 'GET') {
      const after = url.searchParams.get('after');
      const afterCursor = after ? BigInt(after) : BigInt(0);
      const events = params.events.filter((event) => BigInt(String(event.cursor)) > afterCursor);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ runId: params.runId, events }),
      });
      return;
    }

    if (pathname === `/api/v1/agents/schedule-generation/runs/${params.runId}/stream` && method === 'GET') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'mock stream unavailable' }),
      });
      return;
    }

    await route.continue();
  });
}

async function setupWizardLegacyRoute(page: Page, state: { capturedGenerateBody: Record<string, unknown> | null }) {
  await page.route('**/api/v1/telemetry/events', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === '/api/v1/projects/preference-templates' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          templates: [
            {
              id: 'balanced',
              status: 'active',
              label: 'Balanced',
              description: 'Balanced schedule defaults.',
              preferences: { maxTasksPerDay: 4, riskTolerance: 'balanced' },
            },
          ],
          recommendedTemplate: 'balanced',
        }),
      });
      return;
    }

    if (pathname === '/api/v1/fields' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: [
            {
              id: 'field-1',
              name: 'テスト圃場',
              crop: 'Tomato',
              geoStatus: 'verified',
              areaSqm: 1200,
              environmentType: 'open_field',
            },
          ],
        }),
      });
      return;
    }

    if (pathname === '/api/v1/agents/recommend' && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          crop: 'Tomato',
          variety: 'Momotaro',
          startDate: '2026-02-20',
          targetHarvestDate: '2026-06-10',
          notes: 'mock recommendation',
          daysToHarvest: 110,
        }),
      });
      return;
    }

    if (pathname === '/api/v1/knowledge/crops' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          knowledge: { cropName: 'tomato', stages: [], pests: [], tips: [] },
        }),
      });
      return;
    }

    if (pathname === '/api/v1/projects' && method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ project: makeProject([]) }),
      });
      return;
    }

    if (pathname === '/api/v1/agents/generate-schedule' && method === 'POST') {
      state.capturedGenerateBody = (request.postDataJSON() || {}) as Record<string, unknown>;
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          generation: {
            mode: 'async',
            runId: 'run-legacy-1',
            source: 'wizard_initial',
            engine: 'legacy_llm',
            state: 'queued',
            statusUrl: '/api/v1/agents/schedule-generation/runs/run-legacy-1',
            eventsUrl: '/api/v1/agents/schedule-generation/runs/run-legacy-1/events',
            streamUrl: '/api/v1/agents/schedule-generation/runs/run-legacy-1/stream',
            retryUrl: '/api/v1/agents/schedule-generation/runs/run-legacy-1/retry',
            pollAfterMs: 1200,
            acceptedAt: '2026-02-19T00:00:00.000Z',
            reusedActiveRun: false,
          },
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe('Vertical planner trace and fallback UX', () => {
  test.beforeEach(async ({ context }) => {
    await attachAuthenticatedSession(context);
  });

  test('shows planner engine metadata and production-ruleset trace context', async ({ page }) => {
    const runId = 'run-vertical-1';
    const state = {
      project: makeProject([]),
      events: [
        {
          cursor: '1',
          runId,
          type: 'stage',
          stage: 'planner_load_ruleset',
          title: 'Loading production agronomy ruleset',
          detail: 'Using PRODUCTION ruleset v17. Shadow rules ignored.',
          meta: {
            engine: 'vertical_planner_v1',
            plannerVersion: 'vertical_planner_v1',
            rulesetVersion: '17',
            optimizerUsed: true,
          },
          createdAt: '2026-02-19T00:00:01.000Z',
        },
      ] as Array<Record<string, unknown>>,
    };

    await mockProjectDetailRoutes(page, {
      runId,
      project: state.project,
      runStatusResolver: (calls) => ({
        state: calls >= 2 ? 'succeeded' : 'running',
        engine: 'vertical_planner_v1',
        plannerVersion: 'vertical_planner_v1',
        rulesetVersion: '17',
        optimizerUsed: true,
      }),
      events: state.events,
    });

    await page.goto(`/ja/projects/project-1?debugMockProject=empty&generationRunId=${runId}`);
    await expect(page.locator('body')).toBeVisible();
    await expect.poll(() => state.project.tasks[0]?.title || '').toBe('Production ruleset task');
    expect(state.project.tasks[0]?.title).toBe('Production ruleset task');
  });

  test('renders fail-open fallback trace and still reaches success', async ({ page }) => {
    const runId = 'run-fallback-1';
    const state = {
      project: makeProject([]),
      events: [
        {
          cursor: '1',
          runId,
          type: 'system',
          stage: 'planner_fallback_legacy',
          title: 'Planner fallback activated',
          detail: 'Planner validation failed. Falling back to legacy generation.',
          meta: {
            engine: 'vertical_planner_v1',
            plannerVersion: 'vertical_planner_v1',
            rulesetVersion: '18',
            optimizerUsed: true,
            fallbackToEngine: 'legacy_llm',
          },
          createdAt: '2026-02-19T00:00:01.000Z',
        },
      ] as Array<Record<string, unknown>>,
    };

    await mockProjectDetailRoutes(page, {
      runId,
      project: state.project,
      runStatusResolver: (calls) => ({
        state: calls >= 3 ? 'succeeded' : 'running',
        engine: 'legacy_llm',
        plannerVersion: null,
        rulesetVersion: null,
        optimizerUsed: null,
      }),
      events: state.events,
    });

    await page.goto(`/ja/projects/project-1?debugMockProject=empty&generationRunId=${runId}`);
    await expect(page.getByTestId('schedule-generation-trace-panel')).toBeVisible();
    await expect(page.getByText('Planner fallback activated')).toBeVisible();
    await expect(page.getByTestId('schedule-generation-trace-panel')).toBeHidden({ timeout: 15_000 });
  });

  test('wizard still works with legacy engine when planner is disabled', async ({ page }) => {
    const state: { capturedGenerateBody: Record<string, unknown> | null } = {
      capturedGenerateBody: null,
    };
    const requestUrls: string[] = [];

    await setupWizardLegacyRoute(page, state);
    page.on('request', (request) => {
      requestUrls.push(request.url());
    });

    await page.goto('/ja/projects/create');
    await page.getByRole('button', { name: '新しく植える' }).click();
    await page.getByPlaceholder('例: コシヒカリ').fill('トマト');
    await page.getByRole('button', { name: '次へ' }).click();
    await page.getByRole('button', { name: '次へ：圃場を選択' }).click();
    await page.getByRole('button', { name: /テスト圃場/ }).first().click();
    await page.getByRole('button', { name: 'プロジェクトを作成' }).click();

    await expect(page.getByTestId('wizard-schedule-processing-overlay')).toBeVisible();
    await expect.poll(() => requestUrls.some((url) => url.includes('generationRunId=run-legacy-1'))).toBe(true);

    expect(state.capturedGenerateBody).toBeTruthy();
    expect(state.capturedGenerateBody?.source).toBe('wizard_initial');
  });
});
