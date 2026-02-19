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
  const userId = process.env.PLAYWRIGHT_AUTH_USER_ID || 'e2e-user-1';
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

type ProjectTask = {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'completed';
};

function makeProject(tasks: ProjectTask[]) {
  return {
    id: 'project-1',
    name: 'Tomato 2026',
    crop: 'Tomato',
    variety: 'Momotaro',
    startDate: '2026-02-10',
    targetHarvestDate: '2026-06-10',
    status: 'active',
    notes: 'Async schedule mock',
    primaryFieldId: 'field-1',
    fieldIds: ['field-1'],
    tasks,
    schedulingPreferences: {
      maxTasksPerDay: 4,
    },
  };
}

async function setupWizardAsyncRoutes(page: Page, state: { capturedGenerateBody: Record<string, unknown> | null }) {
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
              preferences: {
                maxTasksPerDay: 4,
                riskTolerance: 'balanced',
              },
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
          knowledge: {
            cropName: 'tomato',
            stages: [],
            pests: [],
            tips: [],
          },
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
            runId: 'run-async-1',
            source: 'wizard_initial',
            engine: 'legacy_llm',
            state: 'queued',
            statusUrl: '/api/v1/agents/schedule-generation/runs/run-async-1',
            eventsUrl: '/api/v1/agents/schedule-generation/runs/run-async-1/events',
            streamUrl: '/api/v1/agents/schedule-generation/runs/run-async-1/stream',
            retryUrl: '/api/v1/agents/schedule-generation/runs/run-async-1/retry',
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

async function setupTracePanelAsyncRoutes(page: Page, state: {
  project: ReturnType<typeof makeProject>;
  runStatusCalls: number;
  events: Array<Record<string, unknown>>;
  successEventPublished: boolean;
}) {
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

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === '/api/v1/projects/project-1' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ project: state.project }),
      });
      return;
    }

    if (pathname === '/api/v1/projects/project-1/reschedule-suggestion' && method === 'GET') {
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
      return;
    }

    if (pathname === '/api/v1/projects/project-1/schedule-revisions/bootstrap' && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          created: false,
          revision: null,
        }),
      });
      return;
    }

    if (pathname === '/api/v1/projects/project-1/schedule-revisions' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          revisions: [],
          page: {
            hasMore: false,
            nextCursor: null,
          },
        }),
      });
      return;
    }

    if (pathname === '/api/v1/agents/schedule-generation/runs/run-async-1' && method === 'GET') {
      state.runStatusCalls += 1;
      const succeeded = state.runStatusCalls >= 3;
      if (succeeded && state.project.tasks.length === 0) {
        state.project.tasks = [
          {
            id: 'task-1',
            title: 'Async generated task',
            dueDate: '2026-02-25T06:00:00.000Z',
            status: 'pending',
          },
        ];
      }

      if (succeeded && !state.successEventPublished) {
        state.successEventPublished = true;
        state.events.push({
          cursor: '2',
          runId: 'run-async-1',
          type: 'state',
          stage: 'completed',
          title: 'Run succeeded',
          detail: 'Revision committed successfully.',
          meta: null,
          createdAt: '2026-02-19T00:00:02.000Z',
        });
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'run-async-1',
          projectId: 'project-1',
          source: 'wizard_initial',
          replanMode: 'replace_all',
          state: succeeded ? 'succeeded' : 'running',
          engine: 'legacy_llm',
          plannerVersion: null,
          rulesetVersion: null,
          optimizerUsed: null,
          attemptsUsed: 1,
          maxAttempts: 2,
          retryable: !succeeded,
          commitRevisionId: succeeded ? 'rev-1' : null,
          errorCode: null,
          errorMessage: null,
          createdAt: '2026-02-19T00:00:00.000Z',
          startedAt: '2026-02-19T00:00:01.000Z',
          completedAt: succeeded ? '2026-02-19T00:00:02.000Z' : null,
        }),
      });
      return;
    }

    if (pathname === '/api/v1/agents/schedule-generation/runs/run-async-1/events' && method === 'GET') {
      const after = url.searchParams.get('after');
      const afterCursor = after ? BigInt(after) : BigInt(0);
      const events = state.events.filter((event) => BigInt(String(event.cursor)) > afterCursor);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          runId: 'run-async-1',
          events,
        }),
      });
      return;
    }

    if (pathname === '/api/v1/agents/schedule-generation/runs/run-async-1/stream' && method === 'GET') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'INTERNAL_ERROR',
          message: 'mock stream unavailable',
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe('Async schedule generation UX (wizard handoff + trace panel)', () => {
  test.beforeEach(async ({ context }) => {
    await attachAuthenticatedSession(context);
  });

  test('wizard initial generation uses async handoff and appends generationRunId', async ({ page }) => {
    const state: { capturedGenerateBody: Record<string, unknown> | null } = {
      capturedGenerateBody: null,
    };
    const requestUrls: string[] = [];

    await setupWizardAsyncRoutes(page, state);
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
    await expect.poll(() => requestUrls.some((url) => url.includes('generationRunId=run-async-1'))).toBe(true);

    expect(state.capturedGenerateBody).toBeTruthy();
    expect(state.capturedGenerateBody?.source).toBe('wizard_initial');
    expect(state.capturedGenerateBody?.projectId).toBe('project-1');
  });

  test('trace panel renders progress and reaches succeeded with polling fallback', async ({ page }) => {
    const state = {
      project: makeProject([]),
      runStatusCalls: 0,
      events: [
        {
          cursor: '1',
          runId: 'run-async-1',
          type: 'stage',
          stage: 'observe_context',
          title: 'Collecting weather and project context',
          detail: null,
          meta: null,
          createdAt: '2026-02-19T00:00:01.000Z',
        },
      ] as Array<Record<string, unknown>>,
      successEventPublished: false,
    };

    await setupTracePanelAsyncRoutes(page, state);

    await page.goto('/ja/projects/project-1?debugMockProject=empty&generationRunId=run-async-1');

    const runningStatus = page.getByText('Status: Running');
    const succeededStatus = page.getByText('Status: Succeeded');

    await expect(page.getByTestId('schedule-generation-trace-panel')).toBeVisible();
    await expect
      .poll(async () => {
        if (await succeededStatus.isVisible()) {
          return 'succeeded';
        }
        if (await runningStatus.isVisible()) {
          return 'running';
        }
        return 'pending';
      })
      .not.toBe('pending');
    await expect(page.getByText('Collecting weather and project context')).toBeVisible();
    await expect(succeededStatus).toBeVisible({ timeout: 15_000 });

    expect(state.project.tasks.length).toBeGreaterThan(0);
  });
});
